-- Device security: limited cohort rollout.
-- Prerequisites:
--   1. migration_device_audit.sql
--   2. migration_device_admin_pilot.sql

do $$
begin
  if to_regclass('public.student_device_security') is null then
    raise exception 'Run migration_device_admin_pilot.sql before this migration';
  end if;
end $$;

alter table public.device_security_settings
  add column if not exists pilot_paused boolean not null default false,
  add column if not exists cohort_enrollment_cap integer not null default 25;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'device_security_settings_cohort_cap_check'
      and conrelid = 'public.device_security_settings'::regclass
  ) then
    alter table public.device_security_settings
      add constraint device_security_settings_cohort_cap_check
      check (cohort_enrollment_cap between 1 and 100);
  end if;
end $$;

create table if not exists public.device_rollout_cohorts (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id) on delete restrict,
  batch_name text not null,
  requested_limit integer not null check (requested_limit between 1 and 100),
  enrolled_count integer not null default 0 check (enrolled_count >= 0),
  skipped_over_limit_count integer not null default 0 check (skipped_over_limit_count >= 0),
  status text not null default 'active' check (status in ('active', 'rolled_back')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  rolled_back_by uuid references public.profiles(id) on delete set null,
  rolled_back_at timestamptz,
  rollback_note text
);

alter table public.student_device_security
  add column if not exists pilot_source text not null default 'individual',
  add column if not exists rollout_id uuid references public.device_rollout_cohorts(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_device_security_pilot_source_check'
      and conrelid = 'public.student_device_security'::regclass
  ) then
    alter table public.student_device_security
      add constraint student_device_security_pilot_source_check
      check (pilot_source in ('individual', 'cohort'));
  end if;
end $$;

create index if not exists student_device_security_rollout_idx
  on public.student_device_security (rollout_id)
  where rollout_id is not null;

alter table public.device_rollout_cohorts enable row level security;
drop policy if exists "Admins can read rollout cohorts" on public.device_rollout_cohorts;
create policy "Admins can read rollout cohorts"
  on public.device_rollout_cohorts for select to authenticated
  using (public.is_admin());

grant select on public.device_rollout_cohorts to authenticated, service_role;
grant update (pilot_paused, cohort_enrollment_cap, updated_at)
  on public.device_security_settings to authenticated, service_role;

drop policy if exists "Authenticated users can read device rollout state" on public.device_security_settings;
create policy "Authenticated users can read device rollout state"
  on public.device_security_settings for select to authenticated
  using (true);

-- Emergency pause: immediately allow pilot students through the RLS gate.
-- Device observations and lock state are retained so the rollout can resume
-- without losing evidence.
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
  v_paused boolean := false;
  v_device_count integer := 0;
  v_max integer := 2;
  v_session_id uuid;
begin
  if v_user_id is null then return true; end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is distinct from 'student' then return true; end if;

  select coalesce(pilot_paused, false), coalesce(max_devices, 2)
    into v_paused, v_max
  from public.device_security_settings where id = 1;
  if v_paused then return true; end if;

  select pilot_enabled, status into v_pilot, v_status
  from public.student_device_security where student_id = v_user_id;
  if not coalesce(v_pilot, false) then return true; end if;
  if v_status = 'locked' then return false; end if;

  select count(*)::integer into v_device_count
  from public.student_devices where student_id = v_user_id;
  if v_device_count > coalesce(v_max, 2) then return false; end if;

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

-- Effective access snapshot used by the client. While the emergency pause is
-- active, an underlying lock is preserved but reported as active to the UI.
create or replace function public.get_my_device_rollout_access()
returns table (
  total_devices integer,
  max_devices integer,
  pilot_enabled boolean,
  pilot_paused boolean,
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
    coalesce((select s.pilot_paused from public.device_security_settings s where s.id = 1), false),
    case
      when coalesce((select s.pilot_paused from public.device_security_settings s where s.id = 1), false) then 'active'
      else coalesce((select s.status from public.student_device_security s where s.student_id = auth.uid()), 'active')
    end,
    case
      when coalesce((select s.pilot_paused from public.device_security_settings s where s.id = 1), false) then null
      else (select s.lock_reason from public.student_device_security s where s.student_id = auth.uid())
    end,
    exists (
      select 1 from public.device_access_requests r
      where r.student_id = auth.uid() and r.status in ('pending', 'contacted')
    )
  where auth.uid() is not null;
$$;

revoke all on function public.get_my_device_rollout_access() from public, anon;
grant execute on function public.get_my_device_rollout_access() to authenticated, service_role;

create or replace function public.admin_set_device_pilot_pause(
  p_paused boolean,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  update public.device_security_settings
  set pilot_paused = p_paused, updated_at = now()
  where id = 1;

  insert into public.device_security_events (student_id, actor_id, action, details)
  select s.student_id, auth.uid(),
         case when p_paused then 'rollout_paused' else 'rollout_resumed' end,
         jsonb_build_object('note', left(coalesce(p_note, ''), 1000))
  from public.student_device_security s
  where s.pilot_enabled;
end;
$$;

revoke all on function public.admin_set_device_pilot_pause(boolean, text) from public, anon;
grant execute on function public.admin_set_device_pilot_pause(boolean, text) to authenticated, service_role;

-- Replaces the individual toggle so switching a cohort student manually
-- detaches them from the cohort record cleanly.
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
    pilot_source, rollout_id, locked_at, lock_reason, device_count_at_lock, updated_at
  ) values (
    p_student_id, p_enabled, 'active',
    case when p_enabled then now() else null end,
    case when p_enabled then auth.uid() else null end,
    'individual', null, null, null, null, now()
  )
  on conflict (student_id) do update set
    pilot_enabled = excluded.pilot_enabled,
    status = 'active',
    pilot_enrolled_at = excluded.pilot_enrolled_at,
    pilot_enrolled_by = excluded.pilot_enrolled_by,
    pilot_source = 'individual',
    rollout_id = null,
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
    jsonb_build_object('source', 'individual', 'device_count', v_count, 'max_devices', v_max)
  );
end;
$$;

revoke all on function public.admin_set_device_pilot(uuid, boolean) from public, anon;
grant execute on function public.admin_set_device_pilot(uuid, boolean) to authenticated, service_role;

create or replace function public.admin_enroll_device_cohort(
  p_batch_id uuid,
  p_limit integer
)
returns table (
  rollout_id uuid,
  enrolled_count integer,
  skipped_over_limit_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap integer := 25;
  v_limit integer;
  v_max integer := 2;
  v_paused boolean := false;
  v_batch_name text;
  v_rollout_id uuid;
  v_enrolled integer := 0;
  v_skipped integer := 0;
  v_student record;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;

  -- Serialize cohort snapshots so two admins cannot enroll overlapping groups.
  perform pg_advisory_xact_lock(hashtext('device_security_cohort_enrollment'));

  select name into v_batch_name from public.batches where id = p_batch_id;
  if v_batch_name is null then raise exception 'Batch not found'; end if;

  select coalesce(cohort_enrollment_cap, 25), coalesce(max_devices, 2), coalesce(pilot_paused, false)
    into v_cap, v_max, v_paused
  from public.device_security_settings where id = 1;
  if v_paused then raise exception 'Resume device enforcement before creating a cohort rollout'; end if;
  v_limit := least(greatest(coalesce(p_limit, 1), 1), coalesce(v_cap, 25));

  select count(*)::integer into v_skipped
  from public.batch_members bm
  join public.profiles p on p.id = bm.student_id and p.role = 'student'
  where bm.batch_id = p_batch_id
    and (select count(*) from public.student_devices d where d.student_id = bm.student_id) > v_max
    and not exists (
      select 1 from public.student_device_security s
      where s.student_id = bm.student_id and s.pilot_enabled
    );

  insert into public.device_rollout_cohorts (
    batch_id, batch_name, requested_limit, skipped_over_limit_count, created_by
  ) values (p_batch_id, v_batch_name, v_limit, v_skipped, auth.uid())
  returning id into v_rollout_id;

  for v_student in
    select bm.student_id
    from public.batch_members bm
    join public.profiles p on p.id = bm.student_id and p.role = 'student'
    where bm.batch_id = p_batch_id
      and (select count(*) from public.student_devices d where d.student_id = bm.student_id) <= v_max
      and not exists (
        select 1 from public.student_device_security s
        where s.student_id = bm.student_id and s.pilot_enabled
      )
    order by p.student_code nulls last, p.full_name, p.id
    limit v_limit
  loop
    insert into public.student_device_security (
      student_id, pilot_enabled, status, pilot_enrolled_at, pilot_enrolled_by,
      pilot_source, rollout_id, updated_at
    ) values (
      v_student.student_id, true, 'active', now(), auth.uid(),
      'cohort', v_rollout_id, now()
    )
    on conflict (student_id) do update set
      pilot_enabled = true,
      status = 'active',
      pilot_enrolled_at = now(),
      pilot_enrolled_by = auth.uid(),
      pilot_source = 'cohort',
      rollout_id = v_rollout_id,
      locked_at = null,
      lock_reason = null,
      device_count_at_lock = null,
      updated_at = now();

    insert into public.device_security_events (student_id, actor_id, action, details)
    values (
      v_student.student_id, auth.uid(), 'cohort_enrolled',
      jsonb_build_object('rollout_id', v_rollout_id, 'batch_id', p_batch_id)
    );
    v_enrolled := v_enrolled + 1;
  end loop;

  update public.device_rollout_cohorts
  set enrolled_count = v_enrolled
  where id = v_rollout_id;

  return query select v_rollout_id, v_enrolled, v_skipped;
end;
$$;

revoke all on function public.admin_enroll_device_cohort(uuid, integer) from public, anon;
grant execute on function public.admin_enroll_device_cohort(uuid, integer) to authenticated, service_role;

create or replace function public.admin_rollback_device_cohort(
  p_rollout_id uuid,
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if not exists (
    select 1 from public.device_rollout_cohorts
    where id = p_rollout_id and status = 'active'
  ) then raise exception 'Active rollout not found'; end if;

  with affected as (
    update public.student_device_security set
      pilot_enabled = false,
      status = 'active',
      locked_at = null,
      lock_reason = null,
      device_count_at_lock = null,
      updated_at = now()
    where rollout_id = p_rollout_id and pilot_enabled
    returning student_id
  ) select count(*)::integer into v_count from affected;

  update public.device_access_requests r set status = 'cancelled', updated_at = now()
  where r.status in ('pending', 'contacted')
    and exists (
      select 1 from public.student_device_security s
      where s.student_id = r.student_id and s.rollout_id = p_rollout_id
    );

  update public.device_rollout_cohorts set
    status = 'rolled_back',
    rolled_back_by = auth.uid(),
    rolled_back_at = now(),
    rollback_note = left(nullif(trim(p_note), ''), 1000)
  where id = p_rollout_id;

  insert into public.device_security_events (student_id, actor_id, action, details)
  select s.student_id, auth.uid(), 'cohort_rolled_back',
         jsonb_build_object('rollout_id', p_rollout_id)
  from public.student_device_security s where s.rollout_id = p_rollout_id;

  return v_count;
end;
$$;

revoke all on function public.admin_rollback_device_cohort(uuid, text) from public, anon;
grant execute on function public.admin_rollback_device_cohort(uuid, text) to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'device_security_settings'
  ) then
    alter publication supabase_realtime add table public.device_security_settings;
  end if;
end $$;

notify pgrst, 'reload schema';
