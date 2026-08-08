-- Migration to add standalone papers feature

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  pdf_url text not null,
  audience_scope text not null default 'batches' check (audience_scope in ('public','program','batches')),
  batch_ids uuid[] not null default '{}',
  audience_program text check (audience_program in ('O/L','A/L')),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.papers enable row level security;

drop policy if exists papers_read on public.papers;
create policy papers_read on public.papers for select using (
  public.is_admin() or (is_published and public.can_view(audience_scope, batch_ids, audience_program))
);

drop policy if exists papers_admin on public.papers;
create policy papers_admin on public.papers for all using (public.is_admin()) with check (public.is_admin());

-- Ensure the 'tutes' bucket exists (reusing this for papers as well)
insert into storage.buckets (id, name, public) values ('tutes','tutes', true) on conflict (id) do nothing;
