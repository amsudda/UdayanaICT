-- ════════════════════════════════════════════════════════════════════
--  Paper leaderboard — ranked on marks, not XP
-- ════════════════════════════════════════════════════════════════════
--
-- The XP board rewards everything a student does. This one answers the
-- other question they actually ask: "how are my papers going against
-- the rest of the batch?" It ranks on average percentage across marked
-- papers, split by type, because a timing paper and a full paper are
-- not the same test and mixing them makes both numbers meaningless.
--
-- Scoped to the caller's own batches, and SECURITY DEFINER for the same
-- reason as xp_leaderboard: profiles is own-row-only and must stay that
-- way, so this exposes name, avatar and paper results and nothing else.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly. Requires
-- migration_paper_marks.sql.

create or replace function public.paper_leaderboard(
  p_type  text default 'full',   -- 'full', 'timing' or 'all'
  p_limit int  default 50)
returns table (
  student_id    uuid,
  display_name  text,
  avatar_url    text,
  avg_pct       numeric,
  best_pct      numeric,
  papers_count  int,
  rank_position int
) language sql stable security definer set search_path = public as $$
  with peers as (
    select distinct bm.student_id
      from public.batch_members bm
     where bm.batch_id in (
       select batch_id from public.batch_members where student_id = auth.uid()
     )
  ),
  scored as (
    select m.student_id,
           round(avg((m.marks / m.max_marks) * 100), 1) as avg_pct,
           round(max((m.marks / m.max_marks) * 100), 1) as best_pct,
           count(*)::int                                as papers_count
      from public.paper_marks m
     where m.student_id in (select student_id from peers)
       and m.max_marks > 0
       and m.marks is not null
       and (p_type = 'all' or m.type = p_type)
     group by m.student_id
  )
  -- Ties break on who has sat more papers: consistency over a lucky one-off.
  select s.student_id,
         coalesce(p.full_name, 'Student'),
         p.avatar_url,
         s.avg_pct,
         s.best_pct,
         s.papers_count,
         rank() over (order by s.avg_pct desc, s.papers_count desc)::int
    from scored s
    join public.profiles p on p.id = s.student_id
   order by s.avg_pct desc, s.papers_count desc
   limit p_limit;
$$;

grant execute on function public.paper_leaderboard(text, int) to anon, authenticated, service_role;
