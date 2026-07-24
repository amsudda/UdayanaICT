-- ============================================================
--  Google Sign-In support
--  Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

-- 1. Track whether a student has filled in the profile form yet.
--    New Google users start false → they are sent to /complete-profile.
alter table public.profiles
  add column if not exists profile_completed boolean not null default false;

-- 2. Everyone who already exists (the current ~40 students + admin) has a
--    full profile already — mark them complete so they skip the form.
update public.profiles set profile_completed = true where profile_completed = false;

-- 3. Upgrade the auto-create-profile trigger.
--    - For Google sign-ups: pull name + avatar from Google's metadata
--      (full_name/name, avatar_url/picture).
--    - For the old password signup: still read the detail fields it passed
--      as metadata, so nothing regresses.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (
    id, email, full_name, avatar_url, role,
    phone, nic, gender, birth_date, school, district, medium, program, exam_year,
    guardian_name, guardian_phone, address
  )
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      ''
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    'student',
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'nic', ''),
    nullif(new.raw_user_meta_data->>'gender', ''),
    nullif(new.raw_user_meta_data->>'birth_date', '')::date,
    nullif(new.raw_user_meta_data->>'school', ''),
    nullif(new.raw_user_meta_data->>'district', ''),
    nullif(new.raw_user_meta_data->>'medium', ''),
    nullif(new.raw_user_meta_data->>'program', ''),
    nullif(new.raw_user_meta_data->>'exam_year', '')::int,
    nullif(new.raw_user_meta_data->>'guardian_name', ''),
    nullif(new.raw_user_meta_data->>'guardian_phone', ''),
    nullif(new.raw_user_meta_data->>'address', '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- ============================================================
--  DONE.
-- ============================================================
