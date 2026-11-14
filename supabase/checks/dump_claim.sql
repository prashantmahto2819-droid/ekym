-- print current definitions (read-only)
do $$ declare r record; begin
  for r in select p.proname, pg_get_functiondef(p.oid) d from pg_proc p where p.pronamespace = 'public'::regnamespace
            and p.proname in ('claim_admin_families', 'phone_taken', 'phone_check', 'trg_members_phone_dup', 'trg_families_phone_dup') loop
    raise notice E'\n===== %\n%', r.proname, r.d;
  end loop;
  for r in select tgname, tgrelid::regclass::text t, pg_get_triggerdef(oid) d from pg_trigger where not tgisinternal and tgrelid in ('public.members'::regclass, 'public.families'::regclass, 'public.profiles'::regclass) loop
    raise notice 'TRIGGER % on %: %', r.tgname, r.t, r.d;
  end loop;
end $$;
