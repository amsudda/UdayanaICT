-- Per-promotion toggle: show or hide the text overlay (tag/title/button)
-- on the landing carousel. Off = the uploaded ad artwork shows clean.
alter table public.promotions add column if not exists show_overlay boolean not null default true;
