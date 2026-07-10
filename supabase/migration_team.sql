-- Team members (staff) with per-section permissions.
-- Run the WHOLE file in a new Supabase SQL editor tab. Safe to re-run.

-- 1) allow the 'staff' role + permissions column
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','admin','staff'));
alter table public.profiles add column if not exists admin_perms text[] not null default '{}';

-- 2) owner check (full admin) vs admin check (owner + staff)
create or replace function public.is_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;

-- 3) escalation guard: only the owner may change roles or permissions
create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.admin_perms is distinct from old.admin_perms)
     and not public.is_owner() then
    raise exception 'Only the owner can change roles or permissions';
  end if;
  return new;
end; $$;

drop trigger if exists trg_guard_role on public.profiles;
create trigger trg_guard_role before update on public.profiles
  for each row execute function public.guard_role_change();

grant execute on function public.is_owner() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

select 'team migration ready' as status;
