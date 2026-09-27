-- ════════════════════════════════════════════════════════════════════
--  Quizzes, Google-Forms style — images and section headers
-- ════════════════════════════════════════════════════════════════════
--
-- The papers this system carries are printed A/L papers: a question is
-- an image of the original, in Sinhala and English, with numbered
-- options underneath. Typing that into a text box loses the paper's own
-- formatting, its tables and its diagrams, so the builder needs to take
-- an image per question the way Google Forms does.
--
-- Two additions:
--   * images — a banner across the top of the quiz, and one image per
--     question (shown above whatever text the question carries).
--   * sections — heading blocks between questions, carrying their own
--     title, note and optional image, for "Paper 05 — Part A".
--
-- Sections live in quiz_questions rather than a table of their own, so
-- they keep their place in a single ordered list. `kind` separates them,
-- and it is a new column, so nothing already stored changes meaning.
--
-- Run in the Supabase SQL editor. Safe to run repeatedly.

-- ── 1. Quiz banner ──────────────────────────────────────────────────
alter table public.quizzes
  add column if not exists header_image_url text,
  add column if not exists header_color text not null default '#c20f24';

-- ── 2. Question images, sections, required flag ─────────────────────
alter table public.quiz_questions
  add column if not exists image_url text,
  add column if not exists kind text not null default 'question',
  add column if not exists section_title text,
  add column if not exists section_note text,
  add column if not exists is_required boolean not null default true;

alter table public.quiz_questions drop constraint if exists quiz_questions_kind_check;
alter table public.quiz_questions add constraint quiz_questions_kind_check
  check (kind in ('question','section'));

-- A section carries no answer, so it must never be marked. Anything
-- that counts a quiz out of a total should filter on kind = 'question';
-- zero marks keeps older code that doesn't know about sections honest.
update public.quiz_questions set marks = 0 where kind = 'section' and marks <> 0;

-- ── 3. Image storage ────────────────────────────────────────────────
-- Public read: a quiz image is no more secret than the quiz itself, and
-- a signed URL per question would slow the player down for nothing.
-- Only admins can write.
insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true)
on conflict (id) do nothing;

drop policy if exists quiz_images_read on storage.objects;
create policy quiz_images_read on storage.objects for select
  using (bucket_id = 'quiz-images');

drop policy if exists quiz_images_write on storage.objects;
create policy quiz_images_write on storage.objects for insert
  with check (bucket_id = 'quiz-images' and public.is_admin());

drop policy if exists quiz_images_update on storage.objects;
create policy quiz_images_update on storage.objects for update
  using (bucket_id = 'quiz-images' and public.is_admin());

drop policy if exists quiz_images_delete on storage.objects;
create policy quiz_images_delete on storage.objects for delete
  using (bucket_id = 'quiz-images' and public.is_admin());

-- ── 4. The student-facing view ──────────────────────────────────────
-- QuizPlayerPage reads quiz_questions_safe, not quiz_questions, so the
-- correct answer never reaches the browser. The view has to be rebuilt
-- to carry the new columns. It is recreated here from what the player
-- needs; if your live view did anything else, check it after running.
-- Deliberately NOT security_invoker: the view exists so a student can
-- read questions without being able to read quiz_questions, where the
-- correct answer lives. Running it as the invoker would apply that
-- table's RLS and hand every student an empty quiz.
drop view if exists public.quiz_questions_safe;
create view public.quiz_questions_safe as
  select id,
         quiz_id,
         kind,
         type,
         question_text,
         image_url,
         section_title,
         section_note,
         options,
         marks,
         is_required,
         order_index
    from public.quiz_questions;

grant select on public.quiz_questions_safe to anon, authenticated, service_role;
