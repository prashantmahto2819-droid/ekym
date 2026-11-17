do $$ declare r record; l text; begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('my_profile','profile_details','update_origin_village') loop
    raise notice '#### %', r.proname;
    foreach l in array string_to_array(pg_get_functiondef(r.oid), E'\n') loop raise notice '| %', l; end loop;
  end loop;
  for r in select privilege_type, column_name from information_schema.column_privileges where table_schema='public' and table_name='profiles' and grantee='authenticated' and column_name in ('district','address','village') loop raise notice 'COLPRIV % %', r.privilege_type, r.column_name; end loop;
  for r in select privilege_type from information_schema.table_privileges where table_schema='public' and table_name='profiles' and grantee='authenticated' loop raise notice 'TABPRIV %', r.privilege_type; end loop;
  for r in select privilege_type from information_schema.table_privileges where table_schema='public' and table_name='villages' and grantee='authenticated' loop raise notice 'VILPRIV %', r.privilege_type; end loop;
  for r in select polname, polcmd from pg_policy where polrelid = 'public.villages'::regclass loop raise notice 'VILPOL % %', r.polname, r.polcmd; end loop;
  raise notice 'K1 profile cols: %', (select string_agg(column_name, ',') from information_schema.columns where table_schema='public' and table_name='profiles' and column_name ilike any(array['%district%','%vidhan%','%constit%','%assembly%','%state%','%pincode%']));
end $$;
