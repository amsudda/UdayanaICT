-- Device audit foundation.
-- This migration observes student browser installations only. It does not
-- block accounts or revoke sessions; enforcement belongs to a later phase.

create extension if not exists pgcrypto;

create table if not exists public.device_security_settings (
  id integer primary key default 1 check (id = 1),
  mode text not null default 'audit' check (mode in ('audit', 'enforce')),
  max_devices integer not null default 2 check (max_devices between 1 and 20),
  updated_at timestamptz not null default now()
);

insert into public.device_security_settings (id, mode, max_devices)
values (1, 'audit', 2)
on conflict (id) do nothing;

create table if not exists public.student_devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  installation_hash text not null,
  display_name text,
  device_type text not null default 'unknown'
    check (device_type in ('desktop', 'mobile', 'tablet', 'unknown')),
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  model text,
  language text,
  timezone text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  login_count integer not null default 0 check (login_count >= 0),
  first_session_id uuid,
  last_session_id uuid,
  would_exceed_limit boolean not null default false,
  unique (student_id, installation_hash)
);

create index if not exists student_devices_student_last_seen_idx
  on public.student_devices (student_id, last_seen desc);
create index if not exists student_devices_flagged_idx
  on public.student_devices (would_exceed_limit, last_seen desc)
  where would_exceed_limit = true;

create table if not exists public.student_device_sessions (
  session_id uuid primary key,
  student_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid not null references public.student_devices(id) on delete cascade,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists student_device_sessions_student_idx
  on public.student_device_sessions (student_id, last_seen desc);

create table if not exists public.device_audit_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  device_id uuid references public.student_devices(id) on delete set null,
  session_id uuid,
  event_type text not null check (
    event_type in ('device_registered', 'session_seen', 'limit_would_exceed')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists device_audit_events_student_created_idx
  on public.device_audit_events (student_id, created_at desc);

alter table public.device_security_settings enable row level security;
alter table public.student_devices enable row level security;
alter table public.student_device_sessions enable row level security;
alter table public.device_audit_events enable row level security;

drop policy if exists "Admins can read device security settings" on public.device_security_settings;
create policy "Admins can read device security settings"
  on public.device_security_settings for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update device security settings" on public.device_security_settings;
create policy "Admins can update device security settings"
  on public.device_security_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read student devices" on public.student_devices;
create policy "Admins can read student devices"
  on public.student_devices for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read device sessions" on public.student_device_sessions;
create policy "Admins can read device sessions"
  on public.student_device_sessions for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read device audit events" on public.device_audit_events;
create policy "Admins can read device audit events"
  on public.device_audit_events for select
  to authenticated
  using (public.is_admin());

grant select on public.device_security_settings to authenticated, service_role;
grant update (mode, max_devices, updated_at) on public.device_security_settings to authenticated, service_role;
grant select on public.student_devices to authenticated, service_role;
grant select on public.student_device_sessions to authenticated, service_role;
grant select on public.device_audit_events to authenticated, service_role;

create or replace function public.audit_register_device(
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
  would_exceed_limit boolean,
  is_new_device boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_hash text;
  v_device_id uuid;
  v_session_id uuid;
  v_session_exists boolean := false;
  v_new_device boolean := false;
  v_total integer := 0;
  v_max integer := 2;
  v_exceeds boolean := false;
  v_device_type text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_installation_token is null
    or length(p_installation_token) < 32
    or length(p_installation_token) > 512 then
    raise exception 'Invalid installation token';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is distinct from 'student' then
    return;
  end if;

  -- Serialise registrations for one student so simultaneous tabs cannot
  -- create inconsistent counts.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');
  v_device_type := case
    when p_device_type in ('desktop', 'mobile', 'tablet', 'unknown') then p_device_type
    else 'unknown'
  end;

  select sd.id into v_device_id
  from public.student_devices sd
  where sd.student_id = v_user_id and sd.installation_hash = v_hash;

  if v_device_id is null then
    v_new_device := true;
    insert into public.student_devices (
      student_id, installation_hash, display_name, device_type,
      browser_name, browser_version, os_name, os_version, model,
      language, timezone
    ) values (
      v_user_id, v_hash, nullif(trim(p_display_name), ''), v_device_type,
      nullif(trim(p_browser_name), ''), nullif(trim(p_browser_version), ''),
      nullif(trim(p_os_name), ''), nullif(trim(p_os_version), ''),
      nullif(trim(p_model), ''), nullif(trim(p_language), ''),
      nullif(trim(p_timezone), '')
    )
    returning id into v_device_id;
  else
    update public.student_devices sd set
      display_name = coalesce(nullif(trim(p_display_name), ''), sd.display_name),
      device_type = v_device_type,
      browser_name = coalesce(nullif(trim(p_browser_name), ''), sd.browser_name),
      browser_version = coalesce(nullif(trim(p_browser_version), ''), sd.browser_version),
      os_name = coalesce(nullif(trim(p_os_name), ''), sd.os_name),
      os_version = coalesce(nullif(trim(p_os_version), ''), sd.os_version),
      model = coalesce(nullif(trim(p_model), ''), sd.model),
      language = coalesce(nullif(trim(p_language), ''), sd.language),
      timezone = coalesce(nullif(trim(p_timezone), ''), sd.timezone),
      last_seen = now()
    where sd.id = v_device_id;
  end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    v_session_id := null;
  end;

  if v_session_id is not null then
    select exists (
      select 1 from public.student_device_sessions s where s.session_id = v_session_id
    ) into v_session_exists;

    insert into public.student_device_sessions (session_id, student_id, device_id)
    values (v_session_id, v_user_id, v_device_id)
    on conflict (session_id) do update set
      last_seen = now(),
      device_id = excluded.device_id;

    if not v_session_exists then
      update public.student_devices set
        login_count = login_count + 1,
        first_session_id = coalesce(first_session_id, v_session_id),
        last_session_id = v_session_id
      where id = v_device_id;
    end if;
  elsif v_new_device then
    update public.student_devices set login_count = 1 where id = v_device_id;
  end if;

  select count(*)::integer into v_total
  from public.student_devices sd where sd.student_id = v_user_id;

  select max_devices into v_max
  from public.device_security_settings where id = 1;
  v_max := coalesce(v_max, 2);
  v_exceeds := v_total > v_max;

  update public.student_devices
  set would_exceed_limit = v_exceeds, last_seen = now()
  where id = v_device_id;

  insert into public.device_audit_events (
    student_id, device_id, session_id, event_type, metadata
  ) values (
    v_user_id,
    v_device_id,
    v_session_id,
    case when v_new_device then 'device_registered' else 'session_seen' end,
    jsonb_build_object('total_devices', v_total, 'max_devices', v_max)
  );

  if v_new_device and v_exceeds then
    insert into public.device_audit_events (
      student_id, device_id, session_id, event_type, metadata
    ) values (
      v_user_id, v_device_id, v_session_id, 'limit_would_exceed',
      jsonb_build_object('total_devices', v_total, 'max_devices', v_max)
    );
  end if;

  return query select v_device_id, v_total, v_exceeds, v_new_device;
end;
$$;

revoke all on function public.audit_register_device(
  text, text, text, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.audit_register_device(
  text, text, text, text, text, text, text, text, text, text
) to authenticated, service_role;

-- Add the audit table to Realtime when it is not already present. This lets
-- the admin badge update without refreshing, but has no effect on access.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_devices'
  ) then
    alter publication supabase_realtime add table public.student_devices;
  end if;
end $$;

notify pgrst, 'reload schema';
