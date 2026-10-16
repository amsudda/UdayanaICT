-- Device security: rollout monitoring and student self-service visibility.
-- Prerequisites:
--   1. migration_device_audit.sql
--   2. migration_device_admin_pilot.sql
--   3. migration_device_limited_rollout.sql

do $$
begin
  if to_regclass('public.device_rollout_cohorts') is null then
    raise exception 'Run migration_device_limited_rollout.sql before this migration';
  end if;
end $$;

alter table public.device_access_requests
  add column if not exists request_type text not null default 'unlock',
  add column if not exists target_device_id uuid references public.student_devices(id) on delete set null,
  add column if not exists target_device_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'device_access_requests_type_check'
      and conrelid = 'public.device_access_requests'::regclass
  ) then
    alter table public.device_access_requests
      add constraint device_access_requests_type_check
      check (request_type in ('unlock', 'replacement'));
  end if;
end $$;

-- Return only the signed-in student's device metadata. The installation token
-- is hashed inside Postgres and is used only to label the current browser.
create or replace function public.get_my_devices(p_installation_token text)
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
  is_current boolean
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
  if not exists (select 1 from public.profiles where profiles.id = v_user_id and role = 'student') then
    raise exception 'Student account required';
  end if;
  if char_length(coalesce(p_installation_token, '')) < 32 then
    raise exception 'Invalid installation token';
  end if;

  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');

  return query
  select
    d.id, d.display_name, d.device_type, d.browser_name, d.browser_version,
    d.os_name, d.os_version, d.model, d.first_seen, d.last_seen,
    d.login_count, d.would_exceed_limit, d.installation_hash = v_hash
  from public.student_devices d
  where d.student_id = v_user_id
  order by (d.installation_hash = v_hash) desc, d.last_seen desc;
end;
$$;

revoke all on function public.get_my_devices(text) from public, anon;
grant execute on function public.get_my_devices(text) to authenticated, service_role;

-- A replacement request never deletes a device. It only opens an admin review
-- against a specific non-current installation.
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
  if char_length(coalesce(p_installation_token, '')) < 32 then
    raise exception 'Invalid installation token';
  end if;
  if not exists (
    select 1 from public.student_device_security s
    where s.student_id = v_user_id and s.pilot_enabled
  ) then
    raise exception 'Device replacement is available when the device limit is active';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  v_hash := encode(digest(p_installation_token, 'sha256'), 'hex');

  select d.installation_hash, coalesce(d.display_name, 'Unknown device')
    into v_device_hash, v_device_label
  from public.student_devices d
  where d.id = p_device_id and d.student_id = v_user_id
  for update;

  if v_device_hash is null then raise exception 'Device not found'; end if;
  if v_device_hash = v_hash then raise exception 'You cannot replace the device you are currently using'; end if;

  select r.id, r.request_type into v_request_id, v_existing_type
  from public.device_access_requests r
  where r.student_id = v_user_id and r.status in ('pending', 'contacted')
  for update;

  if v_request_id is not null and v_existing_type = 'unlock' then
    raise exception 'An account access request is already waiting for review';
  end if;

  if v_request_id is null then
    insert into public.device_access_requests (
      student_id, reason, request_type, target_device_id, target_device_label
    ) values (
      v_user_id, v_reason, 'replacement', p_device_id, v_device_label
    ) returning id into v_request_id;
  else
    update public.device_access_requests set
      reason = v_reason,
      request_type = 'replacement',
      target_device_id = p_device_id,
      target_device_label = v_device_label,
      status = 'pending',
      admin_note = null,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
    where id = v_request_id;
  end if;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (
    v_user_id, v_user_id, 'replacement_requested',
    jsonb_build_object('request_id', v_request_id, 'device_id', p_device_id, 'device_label', v_device_label)
  );

  return v_request_id;
end;
$$;

revoke all on function public.request_device_replacement(uuid, text, text) from public, anon;
grant execute on function public.request_device_replacement(uuid, text, text) to authenticated, service_role;

create or replace function public.cancel_my_device_replacement(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  update public.device_access_requests set status = 'cancelled', updated_at = now()
  where id = p_request_id
    and student_id = v_user_id
    and request_type = 'replacement'
    and status in ('pending', 'contacted');

  if not found then raise exception 'Open replacement request not found'; end if;

  insert into public.device_security_events (student_id, actor_id, action, details)
  values (v_user_id, v_user_id, 'replacement_cancelled', jsonb_build_object('request_id', p_request_id));
end;
$$;

revoke all on function public.cancel_my_device_replacement(uuid) from public, anon;
grant execute on function public.cancel_my_device_replacement(uuid) to authenticated, service_role;

-- Keep the locked-account request path authoritative if a student becomes
-- locked while a replacement request is still open.
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

  perform pg_advisory_xact_lock(hashtext(v_user_id::text));
  select id into v_request_id
  from public.device_access_requests
  where student_id = v_user_id and status in ('pending', 'contacted')
  for update;

  if v_request_id is null then
    insert into public.device_access_requests (student_id, reason, request_type)
    values (v_user_id, v_reason, 'unlock')
    returning id into v_request_id;
  else
    update public.device_access_requests set
      reason = v_reason,
      request_type = 'unlock',
      target_device_id = null,
      target_device_label = null,
      status = 'pending',
      admin_note = null,
      reviewed_by = null,
      reviewed_at = null,
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

-- Enforce the same replacement sequence at the database boundary: an admin
-- must remove the requested record before approving the open request.
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
  v_target_device_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_student_id::text));

  if not exists (
    select 1 from public.student_device_security
    where student_id = p_student_id and pilot_enabled
  ) then raise exception 'Student is not enrolled in the pilot'; end if;

  select request_type, target_device_id into v_request_type, v_target_device_id
  from public.device_access_requests
  where student_id = p_student_id and status in ('pending', 'contacted')
  for update;

  if v_request_type = 'replacement' and v_target_device_id is not null then
    raise exception 'Remove the requested device before approving this replacement';
  end if;

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
  values (
    p_student_id, auth.uid(),
    case when v_request_type = 'replacement' then 'replacement_approved' else 'access_restored' end,
    jsonb_build_object('admin_note', p_admin_note)
  );
end;
$$;

revoke all on function public.admin_restore_device_access(uuid, text) from public, anon;
grant execute on function public.admin_restore_device_access(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
