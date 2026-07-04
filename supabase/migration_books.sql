-- Books showcase (short notes, model paper books, ...) shown on the landing
-- page as 3D mockups. Run this in the Supabase SQL editor.

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price text,                                   -- free text, e.g. "Rs. 750"
  order_link text,                              -- e.g. https://wa.me/94719735601?text=...
  cover_url text,                               -- flat cover art; mockup is CSS
  is_visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

drop policy if exists books_read on public.books;
create policy books_read on public.books
  for select using (is_visible or public.is_admin());

drop policy if exists books_admin on public.books;
create policy books_admin on public.books
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.books to anon;
grant all on public.books to authenticated, service_role;
