-- ============================================================
--  ID card verification
--  Students upload the front + back of their ID; the tutor
--  approves/rejects; only approved students can watch or buy.
--  Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

-- 1. Columns on profiles
alter table public.profiles
  add column if not exists id_front_path text,
  add column if not exists id_back_path  text,
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','approved','rejected')),
  add column if not exists verification_submitted_at timestamptz,
  add column if not exists verification_reviewed_at  timestamptz,
  add column if not exists verification_reviewed_by  uuid references public.profiles(id) on delete set null,
  add column if not exists verification_reject_reason text;

-- 2. Grandfather everyone who already exists — current students + admin
--    keep full access; only NEW signups must verify.
--    (Runs before the guard trigger below, and the service-role SQL
--     editor bypasses the guard anyway.)
update public.profiles set verification_status = 'approved'
where verification_status <> 'approved';

-- 3. Guard: a logged-in student may only move themselves to 'pending'
--    (on submit) and may never touch the review decision fields.
--    Admins — and the service role / SQL editor (auth.uid() is null) —
--    are allowed through untouched.
create or replace function public.guard_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  -- non-admin cannot change the tutor's decision fields
  new.verification_reviewed_by     := old.verification_reviewed_by;
  new.verification_reviewed_at      := old.verification_reviewed_at;
  new.verification_reject_reason    := old.verification_reject_reason;

  -- and may only transition unverified/rejected → pending
  if new.verification_status is distinct from old.verification_status then
    if old.verification_status in ('unverified','rejected')
       and new.verification_status = 'pending' then
      new.verification_submitted_at := now();
    else
      new.verification_status := old.verification_status;
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_guard_verification on public.profiles;
create trigger trg_guard_verification
  before update on public.profiles
  for each row execute function public.guard_verification();

-- 4. Private storage bucket for the ID photos
insert into storage.buckets (id, name, public) values ('id-cards','id-cards', false)
  on conflict (id) do nothing;

-- owner manages their own uploads; admin can read everyone's
drop policy if exists idcard_read on storage.objects;
create policy idcard_read on storage.objects for select
  using (bucket_id = 'id-cards' and (owner = auth.uid() or public.is_admin()));

drop policy if exists idcard_write on storage.objects;
create policy idcard_write on storage.objects for insert
  with check (bucket_id = 'id-cards' and owner = auth.uid());

drop policy if exists idcard_update on storage.objects;
create policy idcard_update on storage.objects for update
  using (bucket_id = 'id-cards' and owner = auth.uid());

-- ============================================================
--  DONE.
-- ============================================================
