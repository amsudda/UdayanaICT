-- ONE-SHOT FIX: tute PDFs (multiple per video) + paper-discussion videos.
-- Safe to run repeatedly. Run the WHOLE file in a NEW query tab in the
-- Supabase SQL editor.

-- 1) columns
alter table public.pack_videos   add column if not exists tute_url text;
alter table public.theory_videos add column if not exists tute_url text;
alter table public.pack_videos   add column if not exists tutes jsonb not null default '[]'::jsonb;
alter table public.theory_videos add column if not exists tutes jsonb not null default '[]'::jsonb;

-- paper-discussion tag for recordings sessions
alter table public.theory_videos add column if not exists kind text not null default 'lesson'
  check (kind in ('lesson','paper'));

-- 2) storage bucket for the PDFs
insert into storage.buckets (id, name, public) values ('tutes','tutes', true) on conflict (id) do nothing;

drop policy if exists tutes_read on storage.objects;
create policy tutes_read on storage.objects for select using (bucket_id = 'tutes');
drop policy if exists tutes_write on storage.objects;
create policy tutes_write on storage.objects for insert with check (bucket_id = 'tutes' and public.is_admin());
drop policy if exists tutes_update on storage.objects;
create policy tutes_update on storage.objects for update using (bucket_id = 'tutes' and public.is_admin());
drop policy if exists tutes_delete on storage.objects;
create policy tutes_delete on storage.objects for delete using (bucket_id = 'tutes' and public.is_admin());

-- 3) carry over any single PDFs from the old column
update public.pack_videos
   set tutes = jsonb_build_array(jsonb_build_object('name','Tute PDF','url',tute_url))
 where tute_url is not null and tutes = '[]'::jsonb;

update public.theory_videos
   set tutes = jsonb_build_array(jsonb_build_object('name','Tute PDF','url',tute_url))
 where tute_url is not null and tutes = '[]'::jsonb;

-- 4) make the API notice the new columns immediately
notify pgrst, 'reload schema';

-- 5) verify — should return 5 rows
select table_name, column_name
  from information_schema.columns
 where (table_name in ('pack_videos','theory_videos') and column_name in ('tutes','tute_url'))
    or (table_name = 'theory_videos' and column_name = 'kind')
 order by table_name, column_name;
