-- Device security: admin-controlled pilot.
-- Prerequisite: migration_device_audit.sql
--
-- Global mode remains audit. An administrator must explicitly enrol each
-- student before the two-device lock can activate for that account.

do $$
begin
  if to_regclass('public.student_devices') is null then
    raise exception 'Run migration_device_audit.sql before this migration';
  end if;
end $$;

create table if not exists public.student_device_security (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  pilot_enabled boolean not null default false,
  status text not null default 'active' check (status in ('active', 'locked')),
  locked_at timestamptz,
  lock_reason text,
  device_count_at_lock integer,
  pilot_enrolled_at timestamptz,
  pilot_enrolled_by uuid references public.profiles(id) on delete set null,
  last_reviewed_at timestamptz,
  last_reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.device_access_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'approved', 'rejected', 'cancelled')),
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists device_access_requests_one_open_idx
  on public.device_access_requests (student_id)
  where status in ('pending', 'contacted');
create index if not exists device_access_requests_queue_idx
  on public.device_access_requests (status, created_at);

create table if not exists public.device_security_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists device_security_events_student_created_idx
  on public.device_security_events (student_id, created_at desc);

alter table public.student_device_security enable row level security;
alter table public.device_access_requests enable row level security;
alter table public.device_security_events enable row level security;

drop policy if exists "Students and admins can read device security" on public.student_device_security;
create policy "Students and admins can read device security"
  on public.student_device_security for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Students and admins can read access requests" on public.device_access_requests;
create policy "Students and admins can read access requests"
  on public.device_access_requests for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can read device security events" on public.device_security_events;
create policy "Admins can read device security events"
  on public.device_security_events for select to authenticated
  using (public.is_admin());

grant select on public.student_device_security to authenticated, service_role;
grant select on public.device_access_requests to authenticated, service_role;
grant select on public.device_security_events to authenticated, service_role;

-- Used by restrictive RLS policies below. Anonymous visitors and admins are
-- unaffected; only locked students enrolled in the pilot are denied.
create or replace function public.student_device_access_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_pilot boolean := false;
  v_status text := 'active';
  v_device_count integer := 0;
  v_max integer := 2;
  v_session_id uuid;
begin
  if v_user_id is null then return true; end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is distinct from 'student' then return true; end if;

  select pilot_enabled, status
    into v_pilot, v_status
  from public.student_device_security
  where student_id = v_user_id;

  if not coalesce(v_pilot, false) then return true; end if;
  if v_status = 'locked' then return false; end if;

  select count(*)::integer into v_device_count
  from public.student_devices where student_id = v_user_id;
  select coalesce(max_devices, 2) into v_max
  from public.device_security_settings where id = 1;
  if v_device_count > coalesce(v_max, 2) then return false; end if;

  -- A pilot session must have registered through the device audit handshake.
  -- This prevents bypassing the React lock screen and querying LMS tables
  -- directly with an otherwise valid access token.
  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if v_session_id is null then return false; end if;

  return exists (
    select 1 from public.student_device_sessions s
    where s.session_id = v_session_id and s.student_id = v_user_id
  );
end;
$$;

revoke all on function public.student_device_access_allowed() from public, anon;
grant execute on function public.student_device_access_allowed() to authenticated, service_role;

-- Register the installation through the audit function, then apply the pilot
-- rule. The advisory lock acquired by audit_register_device lasts for this
-- whole transaction, preventing simultaneous third-device races.
create or replace function public.register_device_access(
  p_installation_token text,
  p_display_name text default null,
  p_device_type text default 'unknown',
  p_browser_name text default null,
  p_browser_version text default null,
  p_os_name text default null,
  p_os_version text default null,
  p_model text default null,
  p_language text default null,
  p_timezone text default null
)
returns table (
  device_id uuid,
  total_devices integer,
  max_devices integer,
  would_exceed_limit boolean,
  is_new_device boolean,
  pilot_enabled boolean,
  access_status text,
  lock_reason text,
  has_open_request boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_audit record;
  v_max integer := 2;
  v_security public.student_device_security%rowtype;
  v_open_request boolean := false;
begin
  select * into v_audit
  from public.audit_register_device(
    p_installation_token, p_display_name, p_device_type, p_browser_name,
    p_browser_version, p_os_name, p_os_version, p_model, p_language, p_timezone
  );

  if v_audit.device_id is null then return; end if;

  insert into public.student_device_security (student_id)
  values (v_user_id)
  on conflict (student_id) do nothing;

  select * into v_security
  from public.student_device_security
  where student_id = v_user_id
  for update;

  select coalesce(ds.max_devices, 2) into v_max
  from public.device_security_settings ds where ds.id = 1;
  v_max := coalesce(v_max, 2);

  if v_security.pilot_enabled
    and v_audit.total_devices > v_max
    and v_security.status <> 'locked' then
    update public.student_device_security set
      status = 'locked',
      locked_at = now(),
      lock_reason = format(
        'This account was used on %s browser installations. The pilot limit is %s.',
        v_audit.total_devices, v_max
      ),
      device_count_at_lock = v_audit.total_devices,
      updated_at = now()
    where student_id = v_user_id
    returning * into v_security;

    insert into public.device_security_events (student_id, actor_id, action, details)
    values (
      v_user_id, v_user_id, 'account_locked',
      jsonb_build_object(
        'device_id', v_audit.device_id,
        'total_devices', v_audit.total_devices,
        'max_devices', v_max
      )
    );
  end if;

  select exists (
    select 1 from public.device_access_requests r
    where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  ) into v_open_request;

  return query select
    v_audit.device_id,
    v_audit.total_devices,
    v_max,
    v_audit.would_exceed_limit,
    v_audit.is_new_device,
    v_security.pilot_enabled,
    v_security.status,
    v_security.lock_reason,
    v_open_request;
end;
$$;

revoke all on function public.register_device_access(
  text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.register_device_access(
  text, text, text, text, text, text, text, text, text, text
) to authenticated, service_role;

create or replace function public.get_my_device_access()
returns table (
  total_devices integer,
  max_devices integer,
  pilot_enabled boolean,
  access_status text,
  lock_reason text,
  has_open_request boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*)::integer from public.student_devices d where d.student_id = auth.uid()),
    coalesce((select s.max_devices from public.device_security_settings s where s.id = 1), 2),
    coalesce((select s.pilot_enabled from public.student_device_security s where s.student_id = auth.uid()), false),
    coalesce((select s.status from public.student_device_security s where s.student_id = auth.uid()), 'active'),
    (select s.lock_reason from public.student_device_security s where s.student_id = auth.uid()),
    exists (
      select 1 from public.device_access_requests r
      where r.student_id = auth.uid() and r.status in ('pending', 'contacted')
    )
  where auth.uid() is not null;
$$;

revoke all on function public.get_my_device_access() from public, anon;
grant execute on function public.get_my_device_access() to authenticated, service_role;

create or replace function public.request_device_access(p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 1000 then
    raise exception 'Please provide a reason between 10 and 1000 characters';
  end if;
  if not exists (
    select 1 from public.student_device_security s
    where s.student_id = v_user_id and s.pilot_enabled and s.status = 'locked'
  ) then
    raise exception 'This account is not currently locked';
  end if;

  select id into v_request_id
  from public.device_access_requests
  where student_id = v_user_id and status in ('pending', 'contacted')
  for update;

  if v_request_id is null then
    insert into public.device_access_requests (student_id, reason)
    values (v_user_id, v_reason)
    returning id into v_request_id;
  else
    update public.device_access_requests set
      reason = v_reason,
      status = 'pending',
      updated_at = now()
    where id = v_request_id;
  end if;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (v_user_id, v_user_id, 'access_requested', jsonb_build_object('request_id', v_request_id));

  return v_request_id;
end;
$$;

revoke all on function public.request_device_access(text) from public, anon;
grant execute on function public.request_device_access(text) to authenticated, service_role;

create or replace function public.admin_set_device_pilot(p_student_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student') then
    raise exception 'Student not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  select count(*)::integer into v_count from public.student_devices where student_id = p_student_id;
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  v_max := coalesce(v_max, 2);

  if p_enabled and v_count > v_max then
    raise exception 'Remove old device records before starting the pilot (% devices observed, limit %)', v_count, v_max;
  end if;

  insert into public.student_device_security (
    student_id, pilot_enabled, status, pilot_enrolled_at, pilot_enrolled_by,
    locked_at, lock_reason, device_count_at_lock, updated_at
  ) values (
    p_student_id, p_enabled, 'active',
    case when p_enabled then now() else null end,
    case when p_enabled then auth.uid() else null end,
    null, null, null, now()
  )
  on conflict (student_id) do update set
    pilot_enabled = excluded.pilot_enabled,
    status = 'active',
    pilot_enrolled_at = excluded.pilot_enrolled_at,
    pilot_enrolled_by = excluded.pilot_enrolled_by,
    locked_at = null,
    lock_reason = null,
    device_count_at_lock = null,
    updated_at = now();

  if not p_enabled then
    update public.device_access_requests set status = 'cancelled', updated_at = now()
    where student_id = p_student_id and status in ('pending', 'contacted');
  end if;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (
    p_student_id, auth.uid(),
    case when p_enabled then 'pilot_enabled' else 'pilot_disabled' end,
    jsonb_build_object('device_count', v_count, 'max_devices', v_max)
  );
end;
$$;

revoke all on function public.admin_set_device_pilot(uuid, boolean) from public, anon;
grant execute on function public.admin_set_device_pilot(uuid, boolean) to authenticated, service_role;

create or replace function public.admin_remove_student_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_label text;
  v_count integer;
  v_max integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  select student_id, display_name into v_student_id, v_label
  from public.student_devices where id = p_device_id for update;
  if v_student_id is null then raise exception 'Device not found'; end if;

  delete from public.student_devices where id = p_device_id;
  select count(*)::integer into v_count from public.student_devices where student_id = v_student_id;
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;

  update public.student_devices
  set would_exceed_limit = (v_count > coalesce(v_max, 2))
  where student_id = v_student_id;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (
    v_student_id, auth.uid(), 'device_removed',
    jsonb_build_object('device_id', p_device_id, 'display_name', v_label, 'remaining_devices', v_count)
  );
end;
$$;

revoke all on function public.admin_remove_student_device(uuid) from public, anon;
grant execute on function public.admin_remove_student_device(uuid) to authenticated, service_role;

create or replace function public.admin_restore_device_access(p_student_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));

  if not exists (
    select 1 from public.student_device_security
    where student_id = p_student_id and pilot_enabled
  ) then raise exception 'Student is not enrolled in the pilot'; end if;

  select count(*)::integer into v_count from public.student_devices where student_id = p_student_id;
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  if v_count > coalesce(v_max, 2) then
    raise exception 'Remove devices until the account is within the % device limit', coalesce(v_max, 2);
  end if;

  update public.student_device_security set
    status = 'active', locked_at = null, lock_reason = null,
    device_count_at_lock = null, last_reviewed_at = now(),
    last_reviewed_by = auth.uid(), updated_at = now()
  where student_id = p_student_id;

  update public.device_access_requests set
    status = 'approved', admin_note = left(nullif(trim(p_admin_note), ''), 1000),
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where student_id = p_student_id and status in ('pending', 'contacted');

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (p_student_id, auth.uid(), 'access_restored', jsonb_build_object('admin_note', p_admin_note));
end;
$$;

revoke all on function public.admin_restore_device_access(uuid, text) from public, anon;
grant execute on function public.admin_restore_device_access(uuid, text) to authenticated, service_role;

create or replace function public.admin_review_device_request(
  p_request_id uuid,
  p_decision text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_decision not in ('contacted', 'approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;

  select student_id into v_student_id
  from public.device_access_requests
  where id = p_request_id and status in ('pending', 'contacted')
  for update;
  if v_student_id is null then raise exception 'Open request not found'; end if;

  if p_decision = 'approved' then
    perform public.admin_restore_device_access(v_student_id, p_admin_note);
    return;
  end if;

  update public.device_access_requests set
    status = p_decision,
    admin_note = left(nullif(trim(p_admin_note), ''), 1000),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  update public.student_device_security set
    last_reviewed_at = now(), last_reviewed_by = auth.uid(), updated_at = now()
  where student_id = v_student_id;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (
    v_student_id, auth.uid(), 'request_' || p_decision,
    jsonb_build_object('request_id', p_request_id, 'admin_note', p_admin_note)
  );
end;
$$;

revoke all on function public.admin_review_device_request(uuid, text, text) from public, anon;
grant execute on function public.admin_review_device_request(uuid, text, text) to authenticated, service_role;

-- A restrictive policy is ANDed with each table's existing policy. This keeps
-- locked pilot students from reading or writing LMS content through the API,
-- while leaving admins, non-pilot students, and public visitors unchanged.
do $$
declare
  v_table text;
  v_tables text[] := array[
    'batches', 'batch_members', 'packs', 'pack_videos', 'theory_months',
    'theory_videos', 'theory_live_links', 'live_classes', 'payments',
    'enrollments', 'progress', 'promotions', 'notifications', 'papers',
    'paper_marks', 'study_logs', 'theory_papers', 'quizzes', 'quiz_questions',
    'quiz_attempts', 'quiz_answers', 'xp_transactions', 'student_ranks',
    'student_achievements', 'resource_downloads'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop policy if exists device_pilot_access_gate on public.%I', v_table);
      execute format(
        'create policy device_pilot_access_gate on public.%I as restrictive for all to authenticated using (public.student_device_access_allowed()) with check (public.student_device_access_allowed())',
        v_table
      );
    end if;
  end loop;
end $$;

-- Keep profile reads available so the lock screen can identify the student,
-- but prevent a locked pilot account from editing its profile through REST.
drop policy if exists device_pilot_profile_write_gate on public.profiles;
create policy device_pilot_profile_write_gate
  on public.profiles as restrictive for update to authenticated
  using (public.student_device_access_allowed())
  with check (public.student_device_access_allowed());

-- quiz_questions_safe is intentionally a definer view so it can omit answer
-- keys. Add the same pilot gate explicitly because table RLS does not flow
-- through a definer view.
do $$
begin
  if to_regclass('public.quiz_questions_safe') is not null then
    execute $view$
      create or replace view public.quiz_questions_safe as
        select id,
               quiz_id,
               kind,
               type,
               question_text,
               image_url,
               section_title,
               section_note,
               options,
               marks,
               is_required,
               order_index
          from public.quiz_questions
         where public.student_device_access_allowed()
    $view$;
  end if;
end $$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['student_device_security', 'device_access_requests'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
