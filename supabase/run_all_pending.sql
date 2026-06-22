-- ============================================================
--  Consolidated "catch-up" migration — safe to run multiple times.
--  Run this in Supabase → SQL Editor if you skipped earlier snippets.
--  Covers: profile auto-fill, multi-batch targeting, tute/other
--  payment types, monthly-recording fee gate, and realtime alerts.
--  (Assumes base schema.sql + fix_grants.sql already ran.)
-- ============================================================

-- 1) Full profile auto-fill on signup (from signup metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (
    id, email, role, student_code,
    full_name, phone, nic, gender, birth_date, school, district, medium,
    program, exam_year, guardian_name, guardian_phone, address
  ) values (
    new.id, new.email, 'student',
    'STU-' || lpad(((abs(hashtext(new.id::text)) % 90000) + 10000)::text, 5, '0'),
    nullif(m->>'full_name',''), nullif(m->>'phone',''), nullif(m->>'nic',''),
    nullif(m->>'gender',''), nullif(m->>'birth_date','')::date, nullif(m->>'school',''),
    nullif(m->>'district',''), nullif(m->>'medium',''), nullif(m->>'program',''),
    nullif(m->>'exam_year','')::int, nullif(m->>'guardian_name',''),
    nullif(m->>'guardian_phone',''), nullif(m->>'address','')
  ) on conflict (id) do nothing;
  return new;
end; $$;

-- 2) Multi-batch targeting
alter table public.packs         add column if not exists batch_ids uuid[] not null default '{}';
alter table public.theory_months add column if not exists batch_ids uuid[] not null default '{}';
alter table public.live_classes  add column if not exists batch_ids uuid[] not null default '{}';
alter table public.promotions    add column if not exists batch_ids uuid[] not null default '{}';

create or replace function public.can_view(p_scope text, p_batch_ids uuid[], p_program text)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_admin()
    or p_scope = 'public'
    or (p_scope = 'program' and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.program = p_program))
    or (p_scope = 'batches' and exists (select 1 from public.batch_members bm where bm.student_id = auth.uid() and bm.batch_id = any(p_batch_ids)));
$$;

drop policy if exists packs_read on public.packs;
create policy packs_read on public.packs for select
  using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_ids, audience_program)));
drop policy if exists packvids_read on public.pack_videos;
create policy packvids_read on public.pack_videos for select using (
  public.is_admin() or exists (select 1 from public.packs p where p.id = pack_videos.pack_id and p.is_published and public.can_view(p.audience_scope, p.batch_ids, p.audience_program)));
drop policy if exists theory_read on public.theory_months;
create policy theory_read on public.theory_months for select
  using (public.is_admin() or (is_published and public.can_view(audience_scope, batch_ids, audience_program)));
drop policy if exists live_read on public.live_classes;
create policy live_read on public.live_classes for select
  using (public.is_admin() or public.can_view(audience_scope, batch_ids, audience_program));
drop policy if exists promo_read on public.promotions;
create policy promo_read on public.promotions for select
  using ((is_active and (audience_scope = 'public' or public.can_view(audience_scope, batch_ids, audience_program))) or public.is_admin());

alter table public.packs         drop column if exists batch_id;
alter table public.theory_months drop column if exists batch_id;
alter table public.live_classes  drop column if exists batch_id;
alter table public.promotions    drop column if exists batch_id;
drop function if exists public.can_view(text, uuid, text);

alter table public.packs drop constraint if exists packs_audience_scope_check;
update public.packs set audience_scope='batches' where audience_scope='batch';
alter table public.packs add constraint packs_audience_scope_check check (audience_scope in ('public','program','batches'));
alter table public.packs alter column audience_scope set default 'batches';

alter table public.theory_months drop constraint if exists theory_months_audience_scope_check;
update public.theory_months set audience_scope='batches' where audience_scope='batch';
alter table public.theory_months add constraint theory_months_audience_scope_check check (audience_scope in ('public','program','batches'));
alter table public.theory_months alter column audience_scope set default 'batches';

alter table public.live_classes drop constraint if exists live_classes_audience_scope_check;
update public.live_classes set audience_scope='batches' where audience_scope='batch';
alter table public.live_classes add constraint live_classes_audience_scope_check check (audience_scope in ('public','program','batches'));
alter table public.live_classes alter column audience_scope set default 'batches';

alter table public.promotions drop constraint if exists promotions_audience_scope_check;
update public.promotions set audience_scope='batches' where audience_scope='batch';
alter table public.promotions add constraint promotions_audience_scope_check check (audience_scope in ('public','program','batches'));
alter table public.promotions alter column audience_scope set default 'public';

-- 3) New payment types (tute / other)
alter table public.payments drop constraint if exists payments_kind_check;
alter table public.payments add constraint payments_kind_check check (kind in ('pack','theory','monthly_fee','tute','other'));

-- 4) Monthly recordings unlocked by that month's approved fee
create or replace function public.has_paid_month(p_month text, p_year int)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.payments
    where student_id = auth.uid() and kind = 'monthly_fee'
      and period_month = p_month and period_year = p_year and status = 'approved');
$$;
drop policy if exists theoryvids_read on public.theory_videos;
create policy theoryvids_read on public.theory_videos for select using (
  public.is_admin() or exists (
    select 1 from public.theory_months t
    where t.id = theory_videos.theory_month_id and t.is_published
      and public.can_view(t.audience_scope, t.batch_ids, t.audience_program)
      and public.has_paid_month(t.month, t.year)));

-- 5) Realtime payment alerts in the admin panel
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='payments') then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
