-- ════════════════════════════════════════════════════════════════════
--  Notices can carry a picture
-- ════════════════════════════════════════════════════════════════════
--
-- A notice is often a photograph: a timetable, a bank slip reminder, a
-- hall allocation, a page of the syllabus. One column is all this needs.
--
-- The file itself goes into the existing public `thumbnails` bucket,
-- under a notices/ prefix, which already reads publicly and writes only
-- for admins — the same bucket promos and featured courses use. No new
-- bucket, no new policies.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly. Requires
-- migration_notices.sql.

alter table public.notifications
  add column if not exists image_url text;
