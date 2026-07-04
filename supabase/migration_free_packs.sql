-- Free lesson packs: any student can watch without paying.
-- Run this in the Supabase SQL editor.
alter table public.packs add column if not exists is_free boolean not null default false;
