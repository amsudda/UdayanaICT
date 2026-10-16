-- Device security: lifecycle hardening.
-- Prerequisites: apply the four earlier device-security migrations in order.

do $$
begin
  if to_regprocedure('public.get_my_devices(text)') is null then
    raise exception 'Run migration_device_rollout_monitoring.sql before this migration';
  end if;
end $$;

alter table public.device_security_settings
  add column if not exists stale_after_days integer not null default 90,
  add column if not exists lifecycle_last_sweep_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'device_security_settings_stale_days_check'
      and conrelid = 'public.device_security_settings'::regclass
  ) then
    alter table public.device_security_settings
      add constraint device_security_settings_stale_days_check
      check (stale_after_days between 30 and 365);
  end if;
end $$;

alter table public.student_devices
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists state_changed_at timestamptz,
  add column if not exists state_changed_by uuid references public.profiles(id) on delete set null,
  add column if not exists state_change_reason text;

alter table public.student_device_security
  add column if not exists lock_device_id uuid references public.student_devices(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_devices_lifecycle_status_check'
      and conrelid = 'public.student_devices'::regclass
  ) then
    alter table public.student_devices
      add constraint student_devices_lifecycle_status_check
      check (lifecycle_status in ('active', 'stale', 'retired', 'revoked'));
  end if;
end $$;

create index if not exists student_devices_active_student_idx
  on public.student_devices (student_id, last_seen desc)
  where lifecycle_status = 'active';

grant update (stale_after_days, lifecycle_last_sweep_at, updated_at)
  on public.device_security_settings to authenticated, service_role;

-- Extend the existing bell notification vocabulary without creating a second
-- student notification system.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('video','live','announcement','rank','achievement','device_security'));

-- Existing old installations enter the archive immediately. They remain
-- visible in history but no longer consume an active slot.
update public.student_devices d set
  lifecycle_status = 'stale',
  state_changed_at = now(),
  state_change_reason = 'Inactive before lifecycle policy activation',
  would_exceed_limit = false
where d.lifecycle_status = 'active'
  and d.last_seen < now() - (
    coalesce((select stale_after_days from public.device_security_settings where id = 1), 90)
    * interval '1 day'
  );

delete from public.student_device_sessions s
using public.student_devices d
where d.id = s.device_id and d.lifecycle_status <> 'active';

update public.student_devices d set would_exceed_limit = (
  select count(*) > coalesce((select max_devices from public.device_security_settings where id = 1), 2)
  from public.student_devices active_device
  where active_device.student_id = d.student_id and active_device.lifecycle_status = 'active'
)
where d.lifecycle_status = 'active';

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
  v_stale_days integer := 90;
  v_exceeds boolean := false;
  v_device_type text;
  v_previous_state text;
  v_staled integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_installation_token is null or length(p_installation_token) < 32 or length(p_installation_token) > 512 then
    raise exception 'Invalid installation token';
  end if;

  select role into v_role from public.profiles where id = v_user_id;
  if v_role is distinct from 'student' then return; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  select coalesce(max_devices, 2), coalesce(stale_after_days, 90)
    into v_max, v_stale_days
  from public.device_security_settings where id = 1;

  update public.student_devices set
    lifecycle_status = 'stale',
    state_changed_at = now(),
    state_changed_by = null,
    state_change_reason = format('Inactive for %s days', v_stale_days),
    would_exceed_limit = false
  where student_id = v_user_id
    and lifecycle_status = 'active'
    and last_seen < now() - (v_stale_days * interval '1 day');
  get diagnostics v_staled = row_count;

  if v_staled > 0 then
    insert into public.device_security_events (student_id, actor_id, action, details)
    values (v_user_id, null, 'devices_marked_stale', jsonb_build_object('count', v_staled, 'stale_after_days', v_stale_days));
  end if;

  delete from public.student_device_sessions s
  using public.student_devices d
  where d.id = s.device_id and d.student_id = v_user_id and d.lifecycle_status <> 'active';

  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');
  v_device_type := case when p_device_type in ('desktop', 'mobile', 'tablet', 'unknown') then p_device_type else 'unknown' end;

  select sd.id, sd.lifecycle_status into v_device_id, v_previous_state
  from public.student_devices sd
  where sd.student_id = v_user_id and sd.installation_hash = v_hash
  for update;

  if v_device_id is null then
    v_new_device := true;
    v_previous_state := null;
    insert into public.student_devices (
      student_id, installation_hash, display_name, device_type,
      browser_name, browser_version, os_name, os_version, model,
      language, timezone, lifecycle_status
    ) values (
      v_user_id, v_hash, nullif(trim(p_display_name), ''), v_device_type,
      nullif(trim(p_browser_name), ''), nullif(trim(p_browser_version), ''),
      nullif(trim(p_os_name), ''), nullif(trim(p_os_version), ''),
      nullif(trim(p_model), ''), nullif(trim(p_language), ''),
      nullif(trim(p_timezone), ''), 'active'
    ) returning id into v_device_id;
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
      lifecycle_status = case when sd.lifecycle_status = 'revoked' then 'revoked' else 'active' end,
      state_changed_at = case when sd.lifecycle_status in ('stale', 'retired') then now() else sd.state_changed_at end,
      state_changed_by = case when sd.lifecycle_status in ('stale', 'retired') then v_user_id else sd.state_changed_by end,
      state_change_reason = case when sd.lifecycle_status in ('stale', 'retired') then 'Device used again' else sd.state_change_reason end,
      last_seen = now()
    where sd.id = v_device_id;

    if v_previous_state in ('stale', 'retired') then
      insert into public.device_security_events (student_id, actor_id, action, details)
      values (v_user_id, v_user_id, 'device_reactivated', jsonb_build_object('device_id', v_device_id, 'previous_state', v_previous_state));
      insert into public.notifications (student_id, message, type)
      values (v_user_id, 'A previously inactive browser was recognised again and now uses an active device slot.', 'device_security');
    end if;
  end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    v_session_id := null;
  end;

  -- Keep the attempted session mapped even for a revoked record. The RLS gate
  -- below requires an active device, so it remains blocked; the mapping only
  -- lets an administrator restore that exact browser without forcing another
  -- login cycle.
  if v_session_id is not null then
    select exists (select 1 from public.student_device_sessions s where s.session_id = v_session_id)
      into v_session_exists;
    insert into public.student_device_sessions (session_id, student_id, device_id)
    values (v_session_id, v_user_id, v_device_id)
    on conflict (session_id) do update set last_seen = now(), device_id = excluded.device_id;
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
  from public.student_devices where student_id = v_user_id and lifecycle_status = 'active';
  v_exceeds := v_total > coalesce(v_max, 2);

  update public.student_devices set
    would_exceed_limit = case when lifecycle_status = 'active' then v_exceeds else false end
  where student_id = v_user_id;

  insert into public.device_audit_events (student_id, device_id, session_id, event_type, metadata)
  values (
    v_user_id, v_device_id, v_session_id,
    case when v_new_device then 'device_registered' else 'session_seen' end,
    jsonb_build_object('active_devices', v_total, 'max_devices', v_max, 'lifecycle_status', coalesce(v_previous_state, 'active'))
  );

  if (v_new_device or v_previous_state in ('stale', 'retired')) and v_exceeds then
    insert into public.device_audit_events (student_id, device_id, session_id, event_type, metadata)
    values (v_user_id, v_device_id, v_session_id, 'limit_would_exceed', jsonb_build_object('active_devices', v_total, 'max_devices', v_max));
  end if;

  return query select v_device_id, v_total, v_exceeds, v_new_device;
end;
$$;

revoke all on function public.audit_register_device(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.audit_register_device(text, text, text, text, text, text, text, text, text, text) to authenticated, service_role;

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
    into v_paused, v_max from public.device_security_settings where id = 1;
  if v_paused then return true; end if;

  select pilot_enabled, status into v_pilot, v_status
  from public.student_device_security where student_id = v_user_id;
  if not coalesce(v_pilot, false) then return true; end if;
  if v_status = 'locked' then return false; end if;

  select count(*)::integer into v_device_count
  from public.student_devices where student_id = v_user_id and lifecycle_status = 'active';
  if v_device_count > coalesce(v_max, 2) then return false; end if;

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then return false;
  end;
  if v_session_id is null then return false; end if;

  return exists (
    select 1 from public.student_device_sessions s
    join public.student_devices d on d.id = s.device_id
    where s.session_id = v_session_id
      and s.student_id = v_user_id
      and d.lifecycle_status = 'active'
  );
end;
$$;

revoke all on function public.student_device_access_allowed() from public, anon;
grant execute on function public.student_device_access_allowed() to authenticated, service_role;

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
  v_device_state text := 'active';
  v_security public.student_device_security%rowtype;
  v_open_request boolean := false;
  v_new_lock boolean := false;
begin
  select * into v_audit
  from public.audit_register_device(
    p_installation_token, p_display_name, p_device_type, p_browser_name,
    p_browser_version, p_os_name, p_os_version, p_model, p_language, p_timezone
  );
  if v_audit.device_id is null then return; end if;

  insert into public.student_device_security (student_id)
  values (v_user_id) on conflict (student_id) do nothing;

  select * into v_security from public.student_device_security
  where student_id = v_user_id for update;
  select coalesce(ds.max_devices, 2) into v_max
  from public.device_security_settings ds where ds.id = 1;
  select lifecycle_status into v_device_state
  from public.student_devices where id = v_audit.device_id;

  -- A count-based lock can clear automatically after old installations become
  -- stale. Explicitly revoked-device locks still require an administrator.
  if v_security.pilot_enabled
    and v_security.status = 'locked'
    and v_security.lock_reason like 'This account was used on%'
    and v_audit.total_devices <= v_max
    and v_device_state = 'active' then
    update public.student_device_security set
      status = 'active', locked_at = null, lock_reason = null,
      device_count_at_lock = null, lock_device_id = null, updated_at = now()
    where student_id = v_user_id returning * into v_security;

    update public.device_access_requests set
      status = 'approved', admin_note = 'Automatically restored after inactive devices became stale',
      reviewed_at = now(), updated_at = now()
    where student_id = v_user_id and request_type = 'unlock' and status in ('pending', 'contacted');

    insert into public.device_security_events (student_id, actor_id, action, details)
    values (v_user_id, null, 'lifecycle_auto_restored', jsonb_build_object('active_devices', v_audit.total_devices));
    insert into public.notifications (student_id, message, type)
    values (v_user_id, 'Your LMS access was restored after inactive browser records moved to device history.', 'device_security');
  end if;

  if v_security.pilot_enabled
    and (v_device_state = 'revoked' or v_audit.total_devices > v_max)
    and v_security.status <> 'locked' then
    v_new_lock := true;
    update public.student_device_security set
      status = 'locked',
      locked_at = now(),
      lock_reason = case
        when v_device_state = 'revoked' then 'A permanently revoked browser attempted to access this account.'
        else format('This account was used on %s active browser installations. The limit is %s.', v_audit.total_devices, v_max)
      end,
      device_count_at_lock = v_audit.total_devices,
      lock_device_id = v_audit.device_id,
      updated_at = now()
    where student_id = v_user_id returning * into v_security;
  end if;

  if v_new_lock then
    insert into public.device_security_events (student_id, actor_id, action, details)
    values (v_user_id, v_user_id, 'account_locked', jsonb_build_object(
      'device_id', v_audit.device_id,
      'active_devices', v_audit.total_devices,
      'max_devices', v_max,
      'device_state', v_device_state
    ));
    insert into public.notifications (student_id, message, type)
    values (v_user_id, 'Your LMS account needs a device security review. Open the access screen to send the administrator a reason.', 'device_security');
  end if;

  select exists (
    select 1 from public.device_access_requests r
    where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  ) into v_open_request;

  return query select
    v_audit.device_id, v_audit.total_devices, v_max,
    v_audit.would_exceed_limit, v_audit.is_new_device,
    v_security.pilot_enabled, v_security.status, v_security.lock_reason,
    v_open_request;
end;
$$;

revoke all on function public.register_device_access(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.register_device_access(text, text, text, text, text, text, text, text, text, text) to authenticated, service_role;

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
    (select count(*)::integer from public.student_devices d where d.student_id = auth.uid() and d.lifecycle_status = 'active'),
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

drop function if exists public.get_my_devices(text);
create function public.get_my_devices(p_installation_token text)
returns table (
  id uuid,
  display_name text,
  device_type text,
  browser_name text,
  browser_version text,
  os_name text,
  os_version text,
  model text,
  first_seen timestamptz,
  last_seen timestamptz,
  login_count integer,
  would_exceed_limit boolean,
  is_current boolean,
  lifecycle_status text,
  state_changed_at timestamptz,
  state_change_reason text
)
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_hash text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id and p.role = 'student') then
    raise exception 'Student account required';
  end if;
  if char_length(coalesce(p_installation_token, '')) < 32 then raise exception 'Invalid installation token'; end if;
  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');

  return query
  select
    d.id, d.display_name, d.device_type, d.browser_name, d.browser_version,
    d.os_name, d.os_version, d.model, d.first_seen, d.last_seen,
    d.login_count, d.would_exceed_limit, d.installation_hash = v_hash,
    d.lifecycle_status, d.state_changed_at, d.state_change_reason
  from public.student_devices d
  where d.student_id = v_user_id
  order by (d.installation_hash = v_hash) desc,
    case d.lifecycle_status when 'active' then 1 when 'stale' then 2 when 'retired' then 3 else 4 end,
    d.last_seen desc;
end;
$$;

revoke all on function public.get_my_devices(text) from public, anon;
grant execute on function public.get_my_devices(text) to authenticated, service_role;

create or replace function public.request_device_replacement(
  p_device_id uuid,
  p_installation_token text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_hash text;
  v_device_hash text;
  v_device_label text;
  v_request_id uuid;
  v_existing_type text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 1000 then
    raise exception 'Please provide a reason between 10 and 1000 characters';
  end if;
  if char_length(coalesce(p_installation_token, '')) < 32 then raise exception 'Invalid installation token'; end if;
  if not exists (
    select 1 from public.student_device_security s
    where s.student_id = v_user_id and s.pilot_enabled
  ) then raise exception 'Device replacement is available when the device limit is active'; end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');
  select d.installation_hash, coalesce(d.display_name, 'Unknown device')
    into v_device_hash, v_device_label
  from public.student_devices d
  where d.id = p_device_id and d.student_id = v_user_id and d.lifecycle_status = 'active'
  for update;

  if v_device_hash is null then raise exception 'Only an active device can be replaced'; end if;
  if v_device_hash = v_hash then raise exception 'You cannot replace the device you are currently using'; end if;

  select r.id, r.request_type into v_request_id, v_existing_type
  from public.device_access_requests r
  where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  for update;
  if v_request_id is not null and v_existing_type = 'unlock' then
    raise exception 'An account access request is already waiting for review';
  end if;

  if v_request_id is null then
    insert into public.device_access_requests (student_id, reason, request_type, target_device_id, target_device_label)
    values (v_user_id, v_reason, 'replacement', p_device_id, v_device_label)
    returning id into v_request_id;
  else
    update public.device_access_requests set
      reason = v_reason, request_type = 'replacement', target_device_id = p_device_id,
      target_device_label = v_device_label, status = 'pending', admin_note = null,
      reviewed_by = null, reviewed_at = null, updated_at = now()
    where id = v_request_id;
  end if;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (v_user_id, v_user_id, 'replacement_requested', jsonb_build_object('request_id', v_request_id, 'device_id', p_device_id, 'device_label', v_device_label));
  return v_request_id;
end;
$$;

revoke all on function public.request_device_replacement(uuid, text, text) from public, anon;
grant execute on function public.request_device_replacement(uuid, text, text) to authenticated, service_role;

create or replace function public.admin_refresh_device_lifecycle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stale_days integer := 90;
  v_count integer := 0;
  v_restored_ids uuid[] := array[]::uuid[];
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select coalesce(stale_after_days, 90) into v_stale_days
  from public.device_security_settings where id = 1;

  with changed as (
    update public.student_devices set
      lifecycle_status = 'stale',
      state_changed_at = now(),
      state_changed_by = auth.uid(),
      state_change_reason = format('Inactive for %s days', v_stale_days),
      would_exceed_limit = false
    where lifecycle_status = 'active'
      and last_seen < now() - (v_stale_days * interval '1 day')
    returning id, student_id
  ) select count(*)::integer into v_count from changed;

  delete from public.student_device_sessions s
  using public.student_devices d
  where d.id = s.device_id and d.lifecycle_status <> 'active';

  update public.student_devices d set would_exceed_limit = (
    select count(*) > coalesce((select max_devices from public.device_security_settings where id = 1), 2)
    from public.student_devices active_device
    where active_device.student_id = d.student_id and active_device.lifecycle_status = 'active'
  )
  where d.lifecycle_status = 'active';

  select coalesce(array_agg(s.student_id), array[]::uuid[]) into v_restored_ids
  from public.student_device_security s
  where s.pilot_enabled
    and s.status = 'locked'
    and s.lock_reason like 'This account was used on%'
    and (
      select count(*) from public.student_devices d
      where d.student_id = s.student_id and d.lifecycle_status = 'active'
    ) <= coalesce((select max_devices from public.device_security_settings where id = 1), 2);

  update public.student_device_security set
    status = 'active', locked_at = null, lock_reason = null,
    device_count_at_lock = null, lock_device_id = null, updated_at = now()
  where student_id = any(v_restored_ids);
  update public.device_access_requests set
    status = 'approved', admin_note = 'Automatically restored by the device lifecycle sweep',
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where student_id = any(v_restored_ids)
    and request_type = 'unlock'
    and status in ('pending', 'contacted');
  insert into public.device_security_events (student_id, actor_id, action, details)
  select restored.student_id, auth.uid(), 'lifecycle_auto_restored', jsonb_build_object('source', 'admin_sweep')
  from unnest(v_restored_ids) as restored(student_id);
  insert into public.notifications (student_id, message, type)
  select restored.student_id, 'Your LMS access was restored after inactive browser records moved to device history.', 'device_security'
  from unnest(v_restored_ids) as restored(student_id);

  update public.device_security_settings set lifecycle_last_sweep_at = now(), updated_at = now()
  where id = 1;

  return v_count;
end;
$$;

revoke all on function public.admin_refresh_device_lifecycle() from public, anon;
grant execute on function public.admin_refresh_device_lifecycle() to authenticated, service_role;

create or replace function public.admin_update_device_lifecycle(p_stale_after_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_stale_after_days < 30 or p_stale_after_days > 365 then
    raise exception 'Inactive-device period must be between 30 and 365 days';
  end if;
  update public.device_security_settings set
    stale_after_days = p_stale_after_days, updated_at = now()
  where id = 1;
  return public.admin_refresh_device_lifecycle();
end;
$$;

revoke all on function public.admin_update_device_lifecycle(integer) from public, anon;
grant execute on function public.admin_update_device_lifecycle(integer) to authenticated, service_role;

create or replace function public.admin_set_student_device_state(
  p_device_id uuid,
  p_state text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_current_state text;
  v_label text;
  v_active_count integer;
  v_max integer := 2;
  v_pilot boolean := false;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if p_state not in ('active', 'retired', 'revoked') then raise exception 'Invalid device state'; end if;

  select student_id, lifecycle_status, coalesce(display_name, 'Unknown device')
    into v_student_id, v_current_state, v_label
  from public.student_devices where id = p_device_id;
  if v_student_id is null then raise exception 'Device not found'; end if;
  perform pg_advisory_xact_lock(hashtext(v_student_id::text));

  select lifecycle_status, coalesce(display_name, 'Unknown device')
    into v_current_state, v_label
  from public.student_devices where id = p_device_id and student_id = v_student_id
  for update;

  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  select coalesce(pilot_enabled, false) into v_pilot
  from public.student_device_security where student_id = v_student_id;
  select count(*)::integer into v_active_count
  from public.student_devices where student_id = v_student_id and lifecycle_status = 'active' and id <> p_device_id;

  if p_state = 'active' and v_pilot and v_active_count >= v_max then
    raise exception 'This student already has % active devices, which is the current limit', v_active_count;
  end if;
  if p_state = 'revoked' and not v_pilot then
    raise exception 'Enable device enforcement for this student before revoking a device';
  end if;

  update public.student_devices set
    lifecycle_status = p_state,
    state_changed_at = now(),
    state_changed_by = auth.uid(),
    state_change_reason = left(nullif(trim(p_reason), ''), 1000),
    would_exceed_limit = false
  where id = p_device_id;

  if p_state <> 'active' then
    delete from public.student_device_sessions where device_id = p_device_id;
  end if;

  select count(*)::integer into v_active_count
  from public.student_devices where student_id = v_student_id and lifecycle_status = 'active';
  update public.student_devices set would_exceed_limit = (v_active_count > v_max)
  where student_id = v_student_id and lifecycle_status = 'active';

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (v_student_id, auth.uid(), 'device_' || p_state, jsonb_build_object(
    'device_id', p_device_id, 'display_name', v_label,
    'previous_state', v_current_state, 'reason', p_reason
  ));
  insert into public.notifications (student_id, message, type)
  values (v_student_id, format('%s was marked %s by the LMS administrator.', v_label, p_state), 'device_security');
end;
$$;

revoke all on function public.admin_set_student_device_state(uuid, text, text) from public, anon;
grant execute on function public.admin_set_student_device_state(uuid, text, text) to authenticated, service_role;

-- Backward-compatible admin action: "remove" now archives the record instead
-- of deleting audit evidence.
create or replace function public.admin_remove_student_device(p_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_set_student_device_state(p_device_id, 'retired', 'Retired through the device review workspace');
end;
$$;

revoke all on function public.admin_remove_student_device(uuid) from public, anon;
grant execute on function public.admin_remove_student_device(uuid) to authenticated, service_role;

create or replace function public.admin_approve_device_replacement(
  p_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_device_id uuid;
  v_device_label text;
  v_active_count integer;
  v_max integer := 2;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select student_id, target_device_id, target_device_label
    into v_student_id, v_device_id, v_device_label
  from public.device_access_requests
  where id = p_request_id
    and request_type = 'replacement'
    and status in ('pending', 'contacted')
  for update;
  if v_student_id is null then raise exception 'Open replacement request not found'; end if;
  if v_device_id is null then raise exception 'The requested device record is no longer available'; end if;

  perform pg_advisory_xact_lock(hashtext(v_student_id::text));
  if not exists (
    select 1 from public.student_devices where id = v_device_id and student_id = v_student_id
  ) then raise exception 'Requested device does not belong to this student'; end if;

  update public.student_devices set
    lifecycle_status = 'retired',
    state_changed_at = now(),
    state_changed_by = auth.uid(),
    state_change_reason = left(coalesce(nullif(trim(p_admin_note), ''), 'Approved device replacement'), 1000),
    would_exceed_limit = false
  where id = v_device_id;
  delete from public.student_device_sessions where device_id = v_device_id;

  select count(*)::integer into v_active_count
  from public.student_devices where student_id = v_student_id and lifecycle_status = 'active';
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  if v_active_count > v_max then raise exception 'The account still has more than % active devices', v_max; end if;
  update public.student_devices set would_exceed_limit = false
  where student_id = v_student_id and lifecycle_status = 'active';

  update public.student_device_security set
    status = case
      when status = 'locked' and (lock_reason like 'This account was used on%' or lock_device_id = v_device_id) then 'active'
      else status
    end,
    locked_at = case when status = 'locked' and (lock_reason like 'This account was used on%' or lock_device_id = v_device_id) then null else locked_at end,
    lock_reason = case when status = 'locked' and (lock_reason like 'This account was used on%' or lock_device_id = v_device_id) then null else lock_reason end,
    device_count_at_lock = case when status = 'locked' and (lock_reason like 'This account was used on%' or lock_device_id = v_device_id) then null else device_count_at_lock end,
    lock_device_id = case when status = 'locked' and (lock_reason like 'This account was used on%' or lock_device_id = v_device_id) then null else lock_device_id end,
    last_reviewed_at = now(),
    last_reviewed_by = auth.uid(), updated_at = now()
  where student_id = v_student_id;
  update public.device_access_requests set
    status = 'approved', admin_note = left(nullif(trim(p_admin_note), ''), 1000),
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (v_student_id, auth.uid(), 'replacement_approved', jsonb_build_object(
    'request_id', p_request_id, 'device_id', v_device_id, 'device_label', v_device_label,
    'active_devices', v_active_count
  ));
  insert into public.notifications (student_id, message, type)
  values (v_student_id, format('Your replacement request for %s was approved. The device moved to history.', coalesce(v_device_label, 'the selected device')), 'device_security');
end;
$$;

revoke all on function public.admin_approve_device_replacement(uuid, text) from public, anon;
grant execute on function public.admin_approve_device_replacement(uuid, text) to authenticated, service_role;

create or replace function public.admin_restore_device_access(p_student_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_max integer;
  v_request_type text;
  v_lock_device_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));
  if not exists (
    select 1 from public.student_device_security where student_id = p_student_id and pilot_enabled
  ) then raise exception 'Student is not enrolled in the pilot'; end if;

  select request_type into v_request_type from public.device_access_requests
  where student_id = p_student_id and status in ('pending', 'contacted') for update;
  if v_request_type = 'replacement' then
    raise exception 'Use the atomic replacement approval action for this request';
  end if;

  select lock_device_id into v_lock_device_id
  from public.student_device_security where student_id = p_student_id;
  if exists (
    select 1 from public.student_devices
    where id = v_lock_device_id and lifecycle_status = 'revoked'
  ) then raise exception 'Restore or retire the revoked device before restoring account access'; end if;

  select count(*)::integer into v_count
  from public.student_devices where student_id = p_student_id and lifecycle_status = 'active';
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  if v_count > v_max then raise exception 'Retire devices until the account is within the % device limit', v_max; end if;

  update public.student_device_security set
    status = 'active', locked_at = null, lock_reason = null,
    device_count_at_lock = null, lock_device_id = null, last_reviewed_at = now(),
    last_reviewed_by = auth.uid(), updated_at = now()
  where student_id = p_student_id;
  update public.device_access_requests set
    status = 'approved', admin_note = left(nullif(trim(p_admin_note), ''), 1000),
    reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where student_id = p_student_id and status in ('pending', 'contacted');

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (p_student_id, auth.uid(), 'access_restored', jsonb_build_object('admin_note', p_admin_note, 'active_devices', v_count));
  insert into public.notifications (student_id, message, type)
  values (p_student_id, 'Your LMS device review is complete and access has been restored.', 'device_security');
end;
$$;

revoke all on function public.admin_restore_device_access(uuid, text) from public, anon;
grant execute on function public.admin_restore_device_access(uuid, text) to authenticated, service_role;

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
  select count(*)::integer into v_count
  from public.student_devices where student_id = p_student_id and lifecycle_status = 'active';
  select coalesce(max_devices, 2) into v_max from public.device_security_settings where id = 1;
  if p_enabled and v_count > v_max then
    raise exception 'Retire old devices before starting the pilot (% active devices, limit %)', v_count, v_max;
  end if;

  insert into public.student_device_security (
    student_id, pilot_enabled, status, pilot_enrolled_at, pilot_enrolled_by,
    pilot_source, rollout_id, locked_at, lock_reason, device_count_at_lock, updated_at
  ) values (
    p_student_id, p_enabled, 'active', case when p_enabled then now() else null end,
    case when p_enabled then auth.uid() else null end, 'individual', null,
    null, null, null, now()
  ) on conflict (student_id) do update set
    pilot_enabled = excluded.pilot_enabled, status = 'active',
    pilot_enrolled_at = excluded.pilot_enrolled_at,
    pilot_enrolled_by = excluded.pilot_enrolled_by,
    pilot_source = 'individual', rollout_id = null,
    locked_at = null, lock_reason = null, device_count_at_lock = null, lock_device_id = null, updated_at = now();

  if not p_enabled then
    update public.device_access_requests set status = 'cancelled', updated_at = now()
    where student_id = p_student_id and status in ('pending', 'contacted');
  end if;
  insert into public.device_security_events (student_id, actor_id, action, details)
  values (p_student_id, auth.uid(), case when p_enabled then 'pilot_enabled' else 'pilot_disabled' end,
    jsonb_build_object('source', 'individual', 'active_devices', v_count, 'max_devices', v_max));
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
    and (
      select count(*) from public.student_devices d
      where d.student_id = bm.student_id and d.lifecycle_status = 'active'
    ) > v_max
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
      and (
        select count(*) from public.student_devices d
        where d.student_id = bm.student_id and d.lifecycle_status = 'active'
      ) <= v_max
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
      v_student.student_id, true, 'active', now(), auth.uid(), 'cohort', v_rollout_id, now()
    ) on conflict (student_id) do update set
      pilot_enabled = true, status = 'active', pilot_enrolled_at = now(),
      pilot_enrolled_by = auth.uid(), pilot_source = 'cohort', rollout_id = v_rollout_id,
      locked_at = null, lock_reason = null, device_count_at_lock = null, lock_device_id = null, updated_at = now();

    insert into public.device_security_events (student_id, actor_id, action, details)
    values (v_student.student_id, auth.uid(), 'cohort_enrolled', jsonb_build_object('rollout_id', v_rollout_id, 'batch_id', p_batch_id));
    v_enrolled := v_enrolled + 1;
  end loop;

  update public.device_rollout_cohorts set enrolled_count = v_enrolled where id = v_rollout_id;
  return query select v_rollout_id, v_enrolled, v_skipped;
end;
$$;

revoke all on function public.admin_enroll_device_cohort(uuid, integer) from public, anon;
grant execute on function public.admin_enroll_device_cohort(uuid, integer) to authenticated, service_role;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['notifications', 'device_security_events'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
