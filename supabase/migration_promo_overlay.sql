-- Promotion overlay controls. Run this in the Supabase SQL editor.
-- show_overlay: show/hide the text block over the ad image.
-- overlay_position: where the text block sits ('left top', 'center', 'right bottom', ...).
alter table public.promotions add column if not exists show_overlay boolean not null default true;
alter table public.promotions add column if not exists overlay_position text not null default 'left';
