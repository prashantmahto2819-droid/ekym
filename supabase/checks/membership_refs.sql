do $$ declare r record; begin
  for r in select conrelid::regclass::text t, conname, pg_get_constraintdef(oid) d from pg_constraint where confrelid = 'public.org_memberships'::regclass loop
    raise notice 'FK % % %', r.t, r.conname, r.d; end loop;
  for r in select conname, pg_get_constraintdef(oid) d from pg_constraint where conrelid = 'public.org_memberships'::regclass and contype in ('c','u') loop
    raise notice 'CON % %', r.conname, r.d; end loop;
  for r in select indexname, indexdef from pg_indexes where tablename = 'org_memberships' loop raise notice 'IDX % %', r.indexname, r.indexdef; end loop;
  for r in select tgname, pg_get_triggerdef(oid) d from pg_trigger where tgrelid = 'public.org_memberships'::regclass and not tgisinternal loop raise notice 'TRG %', r.d; end loop;
  for r in select organization_id, count(*) n, count(*) filter (where mobile !~ '^91[0-9]{10}$') odd from public.org_memberships group by 1 loop raise notice 'ORG % rows % non91 %', r.organization_id, r.n, r.odd; end loop;
end $$;
