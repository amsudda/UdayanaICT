-- Rank the full-paper and timing-paper boards by the newest paper of the
-- selected type shared by the caller's batch peers. A student who only
-- completed an older paper must not keep a permanent leaderboard position.
--
-- The overall board intentionally keeps its historical average.

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
  rank_position int,
  latest_paper_title text,
  latest_paper_date date
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
  eligible_marks as (
    select m.*
      from public.paper_marks m
     where m.student_id in (select student_id from peers)
       and m.max_marks > 0
       and m.marks is not null
       and (p_type = 'all' or m.type = p_type)
  ),
  paper_stats as (
    select m.student_id,
           round(avg((m.marks / m.max_marks) * 100), 1) as average_pct,
           round(max((m.marks / m.max_marks) * 100), 1) as best_pct,
           count(*)::int as papers_count
      from eligible_marks m
     group by m.student_id
  ),
  newest_selected_paper as (
    select m.title, m.paper_no, m.exam_date
      from eligible_marks m
     where p_type in ('full', 'timing')
       and m.type = p_type
     order by m.exam_date desc nulls last,
              m.paper_no desc nulls last,
              m.created_at desc,
              m.id desc
     limit 1
  ),
  newest_paper_scores as (
    select distinct on (m.student_id)
           m.student_id,
           round((m.marks / m.max_marks) * 100, 1) as latest_pct,
           m.title,
           m.exam_date
      from eligible_marks m
      cross join newest_selected_paper latest
     where p_type in ('full', 'timing')
       and m.type = p_type
       and m.exam_date is not distinct from latest.exam_date
       and (
         (latest.paper_no is not null and m.paper_no = latest.paper_no)
         or
         (latest.paper_no is null and lower(trim(m.title)) = lower(trim(latest.title)))
       )
     order by m.student_id, m.created_at desc, m.id desc
  ),
  scored as (
    select stats.student_id,
           stats.average_pct as score_pct,
           stats.best_pct,
           stats.papers_count,
           null::text as latest_paper_title,
           null::date as latest_paper_date
      from paper_stats stats
     where p_type = 'all'

    union all

    select latest.student_id,
           latest.latest_pct as score_pct,
           stats.best_pct,
           stats.papers_count,
           latest.title as latest_paper_title,
           latest.exam_date as latest_paper_date
      from newest_paper_scores latest
      join paper_stats stats on stats.student_id = latest.student_id
     where p_type in ('full', 'timing')
  )
  select s.student_id,
         coalesce(p.full_name, 'Student'),
         p.student_code,
         p.avatar_url,
         s.score_pct,
         s.best_pct,
         s.papers_count,
         rank() over (
           order by s.score_pct desc,
                    case when p_type = 'all' then s.papers_count end desc
         )::int,
         s.latest_paper_title,
         s.latest_paper_date
    from scored s
    join public.profiles p on p.id = s.student_id
   order by s.score_pct desc,
            case when p_type = 'all' then s.papers_count end desc,
            s.student_id
   limit greatest(p_limit, 0);
$$;

revoke all on function public.paper_leaderboard(text, int) from public;
grant execute on function public.paper_leaderboard(text, int) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
