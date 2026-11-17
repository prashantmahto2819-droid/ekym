do $$ declare r record; begin
  for r in select coalesce(o.name_hi, o.name) n, o.parent_id is null root, f.kind, f.status, count(*) c from public.families f join core.organizations o on o.id = f.organization_id group by 1,2,3,4 order by 1 loop
    raise notice 'FAM % root=% kind=% status=% : %', r.n, r.root, r.kind, r.status, r.c; end loop;
  for r in select coalesce(o.name_hi, o.name) n, count(*) c from public.letters l join core.organizations o on o.id = l.organization_id group by 1 loop raise notice 'LETTERS % : %', r.n, r.c; end loop;
  for r in select coalesce(o.name_hi, o.name) n, o.slug, o.parent_id is null root, (select count(*) from public.org_memberships m where m.organization_id = o.id and m.status='active') mem from core.organizations o order by 3 desc, 1 loop
    raise notice 'ORG % (%) root=% members=%', r.n, r.slug, r.root, r.mem; end loop;
  raise notice 'shok admins (profiles.role=admin): %, super: %', (select count(*) from public.profiles where role='admin'), (select count(*) from public.profiles where super_admin);
  raise notice 'approved users w/o any active membership: %', (select count(*) from public.profiles p where p.status='approved' and not exists (select 1 from public.org_memberships m where m.user_id = p.id and m.status='active'));
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
