-- Add student codes to paper leaderboard rows so students with duplicate
-- names are distinguishable. Run after migration_paper_leaderboard.sql.
-- The return type changes, so PostgreSQL requires dropping and recreating it.

drop function if exists public.paper_leaderboard(text, int);

create function public.paper_leaderboard(
  p_type text default 'full',
  p_limit int default 50
)
returns table (
  student_id uuid,
  display_name text,
  student_code text,
  avatar_url text,
  avg_pct numeric,
  best_pct numeric,
  papers_count int,
  rank_position int
)
language sql
stable
security definer
set search_path = public
as $$
  with peers as (
    select distinct bm.student_id
      from public.batch_members bm
     where bm.batch_id in (
       select batch_id
         from public.batch_members
        where student_id = auth.uid()
     )
  ),
  scored as (
    select m.student_id,
           round(avg((m.marks / m.max_marks) * 100), 1) as avg_pct,
           round(max((m.marks / m.max_marks) * 100), 1) as best_pct,
           count(*)::int as papers_count
      from public.paper_marks m
     where m.student_id in (select student_id from peers)
       and m.max_marks > 0
       and m.marks is not null
       and (p_type = 'all' or m.type = p_type)
     group by m.student_id
  )
  select s.student_id,
         coalesce(p.full_name, 'Student'),
         p.student_code,
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

notify pgrst, 'reload schema';
