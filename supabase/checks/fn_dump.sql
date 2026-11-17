do $$ declare r record; l text; begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('directory_members','create_letter_recipients','shok_notice_recipients','shok_deliver_phone','shok_eldest_son_phone','already_covered_members','directory_families') loop
    raise notice '#### %', r.proname;
    foreach l in array string_to_array(pg_get_functiondef(r.oid), E'\n') loop raise notice '| %', l; end loop;
  end loop;
end $$;
