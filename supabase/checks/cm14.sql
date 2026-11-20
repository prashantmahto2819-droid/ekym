do $$
declare su uuid; fam uuid; t text; j jsonb; p record; other uuid; st text; rq uuid;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  select f.id into fam from public.families f where f.status = 'approved' and f.kind = 'tree' and (select count(*) from public.members m where m.family_id = f.id) > 3 limit 1;
  t := public.shok_tree_share_create(fam, 30); raise notice 'token len %', length(t);
  raise notice 'share list rows %', (select count(*) from public.shok_tree_share_list(fam));
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  j := public.shok_tree_shared(t); raise notice 'shared: % members, keys %', jsonb_array_length(j -> 'members'), (select string_agg(k, ',') from jsonb_object_keys(j -> 'members' -> 0) k);
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  perform public.shok_tree_share_revoke(t);
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  raise notice 'after revoke: %', public.shok_tree_shared(t) is null;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  raise notice 'my trees %', (select count(*) from public.k1_matrimony_my_trees());
  select * into p from public.cm_matrimony_profiles limit 1;
  raise notice 'profiles exist: % marital %', p.id is not null, p.marital_status;
  if p.id is not null then
    raise notice 'meta rows %', (select count(*) from public.k1_matrimony_meta(p.organization_id));
    update public.cm_matrimony_profiles set family_id = fam, tree_share = 'ask', status = 'active', verified_at = now() where id = p.id;
    select om.user_id into other from public.org_memberships om where om.organization_id = p.organization_id and om.user_id is not null and om.user_id <> p.user_id and om.status = 'active' limit 1;
    if other is not null then
      perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
      begin
        st := public.k1_matrimony_tree_request(p.id); raise notice 'request: %', st;
        raise notice 'tree before accept is null: %', public.k1_matrimony_tree(p.id) is null;
        select id into rq from public.cm_matrimony_tree_requests where profile_id = p.id and user_id = other;
        perform set_config('request.jwt.claims', json_build_object('sub', p.user_id, 'role', 'authenticated')::text, true);
        raise notice 'inbox rows %', (select count(*) from public.k1_matrimony_tree_inbox(p.organization_id));
        perform public.k1_matrimony_tree_respond(rq, true);
        perform set_config('request.jwt.claims', json_build_object('sub', other, 'role', 'authenticated')::text, true);
        raise notice 'tree after accept members: %', jsonb_array_length(public.k1_matrimony_tree(p.id) -> 'members');
      exception when others then raise notice 'request flow: %', sqlerrm; end;
    else raise notice 'no other member to test request';
    end if;
  end if;
end $$;
