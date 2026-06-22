-- ============================================================
--  Fix: grant table/function access to the API roles.
--  RLS still protects every row — these grants just let the
--  authenticated/anon roles reach the tables at all.
--  Run once in Supabase → SQL Editor.
-- ============================================================

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- make future tables/functions inherit the same grants
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
