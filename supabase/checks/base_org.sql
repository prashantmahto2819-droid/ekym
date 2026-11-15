-- the member with an account applies to another active organization, it is approved, he makes it his base (rolled back)
do $$ declare u uuid; org2 uuid; adm uuid; app uuid; b1 text; b2 text; n int; begin
  select user_id into u from public.org_memberships where user_id is not null and status = 'active' limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  select count(*) into n from public.k1_my_memberships();
  select id into org2 from public.k1_orgs_to_join() limit 1;
  app := public.k1_apply_to_org(org2, 'मैं यहाँ भी जुड़ना चाहता हूँ');
  select coalesce(org_name_hi, org_name) into b1 from public.k1_my_memberships() where is_base;
  update public.org_memberships set status = 'active', member_no = 'TEST/1', decided_at = now() where id = app;  -- as if the admin approved
  perform public.k1_set_base_membership(app);
  select coalesce(org_name_hi, org_name) into b2 from public.k1_my_memberships() where is_base;
  raise notice 'CHECK memberships_before=% applied_to=% base_before=% base_after=% bases_count=%', n,
    (select coalesce(name_hi, name) from core.organizations where id = org2), b1, b2, (select count(*) from public.org_memberships where user_id = u and is_base);
end $$;
