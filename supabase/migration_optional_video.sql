-- Optional video: allow PDF-only lesson items (packs + recordings).
-- Run this in the Supabase SQL editor.
-- Lets the admin save a pack/recordings item that has only PDF tutes and no YouTube link.

alter table public.pack_videos   alter column youtube_id drop not null;
alter table public.theory_videos alter column youtube_id drop not null;
