-- XP leaderboard scoped to one batch selected by the student.
-- Run in the Supabase SQL editor after migration_gamification_v1.sql.
-- SECURITY DEFINER is required because profiles and XP rows are private;
-- the function exposes only leaderboard-safe fields and requires membership.

create or replace function public.xp_batch_leaderboard(
  p_batch_id uuid,
  p_scope text default 'all_time',
  p_limit int default 10000
)
returns table (
  student_id uuid,
  display_name text,
  avatar_url text,
  total_xp int,
  rank_position int
)
language sql
stable
security definer
set search_path = public
as $$
  with authorized_batch as (
    select exists (
      select 1
        from public.batch_members mine
       where mine.batch_id = p_batch_id
         and mine.student_id = auth.uid()
    ) as allowed
  ),
  peers as (
    select bm.student_id
      from public.batch_members bm
     where bm.batch_id = p_batch_id
       and (select allowed from authorized_batch)
  ),
  scoped as (
    select peers.student_id,
           coalesce(sum(t.amount), 0)::int as total_xp
      from peers
      left join public.xp_transactions t
        on t.student_id = peers.student_id
       and (p_scope <> 'weekly' or t.created_at >= date_trunc('week', now()))
     group by peers.student_id
  )
  select s.student_id,
         coalesce(p.full_name, 'Student'),
         p.avatar_url,
         s.total_xp,
         row_number() over (order by s.total_xp desc, s.student_id)::int as rank_position
    from scoped s
    join public.profiles p on p.id = s.student_id
   order by s.total_xp desc, s.student_id
   limit greatest(p_limit, 1);
$$;

revoke all on function public.xp_batch_leaderboard(uuid, text, int) from public;
grant execute on function public.xp_batch_leaderboard(uuid, text, int) to authenticated;

-- Prevent clients from using the legacy RPC, which merges all of a student's
-- batches into a single board. The app now uses xp_batch_leaderboard only.
revoke all on function public.xp_leaderboard(text, int) from public, anon, authenticated;

notify pgrst, 'reload schema';
