do $$ declare r record; l text; begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('decide_user','notify_whatsapp_phone','claim_admin_families') loop
    raise notice '#### %', r.proname;
    foreach l in array string_to_array(pg_get_functiondef(r.oid), E'\n') loop raise notice '| %', l; end loop;
  end loop;
  for r in select tgname, p.proname from pg_trigger g join pg_proc p on p.oid = g.tgfoid where g.tgrelid = 'public.profiles'::regclass and not tgisinternal loop raise notice 'TRG % %', r.tgname, r.proname; end loop;
end $$;
