do $$ declare r record; l text; begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('phone_taken','phone_check','trg_members_phone_dup','trg_families_phone_dup') loop
    raise notice '#### %', r.proname;
    foreach l in array string_to_array(pg_get_functiondef(r.oid), E'\n') loop raise notice '| %', l; end loop;
  end loop;
  for r in select tgname, tgrelid::regclass t, p.proname from pg_trigger g join pg_proc p on p.oid = g.tgfoid where not tgisinternal and p.proname ilike '%dup%' loop raise notice 'TRG % on % -> %', r.tgname, r.t, r.proname; end loop;
end $$;
