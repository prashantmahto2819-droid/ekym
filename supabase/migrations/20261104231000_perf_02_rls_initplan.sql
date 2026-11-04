-- Kalchuri One · Phase 14 · advisor "auth_rls_initplan": wrap auth.uid()/auth.jwt()/auth.role() in RLS policies as
-- (select auth.uid()) so Postgres evaluates it once per query instead of once per row. Done with ALTER POLICY
-- (no drop/recreate), on every policy in public / core / storage that still has the bare call. Idempotent.
do $$
declare r record; q text; w text;
begin
  for r in select schemaname, tablename, policyname, qual, with_check from pg_policies
            where schemaname in ('public','core','storage')
              and ((qual ~ 'auth\.(uid|jwt|role)\(\)' and qual !~* '\(\s*select auth\.') or (with_check ~ 'auth\.(uid|jwt|role)\(\)' and with_check !~* '\(\s*select auth\.'))
  loop
    q := regexp_replace(r.qual, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    w := regexp_replace(r.with_check, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    if q is not null and w is not null then
      execute format('alter policy %I on %I.%I using (%s) with check (%s)', r.policyname, r.schemaname, r.tablename, q, w);
    elsif q is not null then
      execute format('alter policy %I on %I.%I using (%s)', r.policyname, r.schemaname, r.tablename, q);
    elsif w is not null then
      execute format('alter policy %I on %I.%I with check (%s)', r.policyname, r.schemaname, r.tablename, w);
    end if;
  end loop;
end $$;
