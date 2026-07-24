-- ============================================================
--  Admin: delete a student account
--  Removes the auth user + (via cascade) their profile, batch
--  memberships, payments, enrollments, progress, notifications,
--  and their uploaded files. Admin-only.
--  Paste into Supabase → SQL Editor → Run. Safe to re-run.
-- ============================================================

create or replace function public.admin_delete_student(p_student uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- only the tutor/staff may delete
  if not public.is_admin() then
    raise exception 'Only admins can delete students';
  end if;

  -- never delete an admin/staff account through this path
  if not exists (select 1 from public.profiles where id = p_student and role = 'student') then
    raise exception 'Only student accounts can be deleted';
  end if;

  -- remove their storage files (avatars, slips, id cards)
  delete from storage.objects where owner = p_student;

  -- deleting the auth user cascades to profiles and every child row
  delete from auth.users where id = p_student;
end;
$$;

revoke all on function public.admin_delete_student(uuid) from public;
grant execute on function public.admin_delete_student(uuid) to authenticated;

-- ============================================================
--  DONE.
-- ============================================================
