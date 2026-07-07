-- Monthly live-class links attached to each Recordings month.
-- Students see them ONLY after their monthly-fee payment is approved
-- (same has_paid_month gate as the recordings themselves).
-- Run the whole file in a new Supabase SQL editor tab.

create table if not exists public.theory_live_links (
  id uuid primary key default gen_random_uuid(),
  theory_month_id uuid not null references public.theory_months(id) on delete cascade,
  label text not null default 'Join Live Class',
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.theory_live_links enable row level security;

drop policy if exists tll_read on public.theory_live_links;
create policy tll_read on public.theory_live_links for select using (
  public.is_admin() or exists (
    select 1 from public.theory_months t
     where t.id = theory_live_links.theory_month_id
       and t.is_published
       and public.can_view(t.audience_scope, t.batch_ids, t.audience_program)
       and public.has_paid_month(t.month, t.year)
  )
);

drop policy if exists tll_admin on public.theory_live_links;
create policy tll_admin on public.theory_live_links for all
  using (public.is_admin()) with check (public.is_admin());

grant all on public.theory_live_links to anon, authenticated, service_role;

notify pgrst, 'reload schema';

-- verify
select 'theory_live_links ready' as status;
