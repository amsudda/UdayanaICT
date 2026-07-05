-- Multiple tute PDFs per lesson video (packs + recordings).
-- Run this in the Supabase SQL editor (safe to run after migration_tutes.sql).

alter table public.pack_videos add column if not exists tutes jsonb not null default '[]'::jsonb;
alter table public.theory_videos add column if not exists tutes jsonb not null default '[]'::jsonb;

-- carry over any single PDFs saved under the old column
update public.pack_videos
   set tutes = jsonb_build_array(jsonb_build_object('name', 'Tute PDF', 'url', tute_url))
 where tute_url is not null and tutes = '[]'::jsonb;

update public.theory_videos
   set tutes = jsonb_build_array(jsonb_build_object('name', 'Tute PDF', 'url', tute_url))
 where tute_url is not null and tutes = '[]'::jsonb;
