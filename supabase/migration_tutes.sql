-- Per-lesson tute PDFs for pack videos and theory recordings.
-- Run this in the Supabase SQL editor.

alter table public.pack_videos add column if not exists tute_url text;
alter table public.theory_videos add column if not exists tute_url text;

-- public bucket for tute PDFs (students download via URL; admin uploads)
insert into storage.buckets (id, name, public) values ('tutes','tutes', true) on conflict (id) do nothing;

drop policy if exists tutes_read on storage.objects;
create policy tutes_read on storage.objects for select using (bucket_id = 'tutes');
drop policy if exists tutes_write on storage.objects;
create policy tutes_write on storage.objects for insert with check (bucket_id = 'tutes' and public.is_admin());
drop policy if exists tutes_update on storage.objects;
create policy tutes_update on storage.objects for update using (bucket_id = 'tutes' and public.is_admin());
drop policy if exists tutes_delete on storage.objects;
create policy tutes_delete on storage.objects for delete using (bucket_id = 'tutes' and public.is_admin());
