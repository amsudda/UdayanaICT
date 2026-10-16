-- Device security hotfix: keep revoked installations blocked without keeping
-- the student's other approved devices globally locked.
-- Prerequisite: migration_device_lifecycle.sql

do $$
begin
  if to_regprocedure('public.admin_restore_device_access(uuid,text)') is null
    or to_regclass('public.student_devices') is null then
    raise exception 'Run migration_device_lifecycle.sql before this hotfix';
  end if;
end $$;

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
    and v_audit.total_devices > v_max
    and v_security.status <> 'locked' then
    v_new_lock := true;
    update public.student_device_security set
      status = 'locked',
      locked_at = now(),
      lock_reason = format('This account was used on %s active browser installations. The limit is %s.', v_audit.total_devices, v_max),
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

  if v_security.pilot_enabled and v_device_state = 'revoked' and not exists (
    select 1 from public.device_security_events e
    where e.student_id = v_user_id
      and e.action = 'revoked_device_blocked'
      and e.details ->> 'device_id' = v_audit.device_id::text
      and e.created_at > now() - interval '15 minutes'
  ) then
    insert into public.device_security_events (student_id, actor_id, action, details)
    values (v_user_id, v_user_id, 'revoked_device_blocked', jsonb_build_object('device_id', v_audit.device_id));
  end if;

  select exists (
    select 1 from public.device_access_requests r
    where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  ) into v_open_request;

  return query select
    v_audit.device_id, v_audit.total_devices, v_max,
    v_audit.would_exceed_limit, v_audit.is_new_device,
    v_security.pilot_enabled,
    case when v_security.pilot_enabled and v_device_state = 'revoked' then 'locked' else v_security.status end,
    case
      when v_security.pilot_enabled and v_device_state = 'revoked'
        then 'This browser installation was revoked by the LMS administrator. Use an approved device or contact the administrator.'
      else v_security.lock_reason
    end,
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_total integer := 0;
  v_max integer := 2;
  v_pilot boolean := false;
  v_paused boolean := false;
  v_status text := 'active';
  v_reason text;
  v_current_revoked boolean := false;
  v_has_request boolean := false;
begin
  if v_user_id is null then return; end if;

  select coalesce(s.max_devices, 2), coalesce(s.pilot_paused, false)
    into v_max, v_paused
  from public.device_security_settings s where s.id = 1;
  select coalesce(s.pilot_enabled, false), coalesce(s.status, 'active'), s.lock_reason
    into v_pilot, v_status, v_reason
  from public.student_device_security s where s.student_id = v_user_id;
  select count(*)::integer into v_total
  from public.student_devices d
  where d.student_id = v_user_id and d.lifecycle_status = 'active';

  begin
    v_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    v_session_id := null;
  end;

  if v_session_id is not null then
    select exists (
      select 1
      from public.student_device_sessions session_device
      join public.student_devices d on d.id = session_device.device_id
      where session_device.session_id = v_session_id
        and session_device.student_id = v_user_id
        and d.lifecycle_status = 'revoked'
    ) into v_current_revoked;
  end if;

  select exists (
    select 1 from public.device_access_requests r
    where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  ) into v_has_request;

  return query select
    v_total,
    v_max,
    v_pilot,
    v_paused,
    case
      when v_paused then 'active'
      when v_pilot and v_current_revoked then 'locked'
      else v_status
    end,
    case
      when v_paused then null::text
      when v_pilot and v_current_revoked
        then 'This browser installation was revoked by the LMS administrator. Use an approved device or contact the administrator.'
      else v_reason
    end,
    v_has_request;
end;
$$;

revoke all on function public.get_my_device_rollout_access() from public, anon;
grant execute on function public.get_my_device_rollout_access() to authenticated, service_role;

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
  values (p_student_id, 'Your LMS device review is complete and access has been restored. Revoked browser installations remain blocked.', 'device_security');
end;
$$;

revoke all on function public.admin_restore_device_access(uuid, text) from public, anon;
grant execute on function public.admin_restore_device_access(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
