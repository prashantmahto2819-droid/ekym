-- read-only: memberships whose phone ends with the same 10 digits as another in the same organization
do $$ declare r record; begin
  for r in
    with m as (select om.*, right(regexp_replace(coalesce(om.mobile, ''), '\D', '', 'g'), 10) p10 from public.org_memberships om)
    select m.id, m.organization_id, m.user_id, m.member_no, m.full_name, m.mobile, m.status, m.created_at,
           (select left(u.email, 3) || '…' from auth.users u where u.id = m.user_id) em,
           (select u.phone from auth.users u where u.id = m.user_id) uph
      from m where length(m.p10) = 10 and exists (select 1 from m m2 where m2.organization_id = m.organization_id and m2.p10 = m.p10 and m2.id <> m.id)
     order by m.organization_id, m.p10, m.created_at
  loop raise notice 'DUP % | org % | user % | no % | % | mobile % | % | email % | authphone %', r.id, left(r.organization_id::text, 8), r.user_id, r.member_no, r.full_name, r.mobile, r.status, r.em, r.uph; end loop;
  for r in select p.proname, pg_get_functiondef(p.oid) d from pg_proc p where p.pronamespace = 'public'::regnamespace and (p.proname ilike '%sync_membership%' or p.proname ilike '%profile%membership%') loop
    raise notice E'\n===== %\n%', r.proname, r.d; end loop;
end $$;
