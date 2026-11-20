do $$
declare su uuid; d text;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  raise notice 'any member: %', public.k1_is_any_member();
  raise notice 'browse rows: %', (select count(*) from public.k1_matrimony_browse(null, null));
  raise notice 'meta rows: %', (select count(*) from public.k1_matrimony_meta(null));
  raise notice 'inbox rows: %', (select count(*) from public.k1_matrimony_inbox(null));
  raise notice 'tree inbox rows: %', (select count(*) from public.k1_matrimony_tree_inbox(null));
  d := pg_get_functiondef('public.k1_matrimony_browse(uuid, text)'::regprocedure);
  raise notice 'browse org filter gone: %, any-member check: %', position('organization_id = p_org' in d) = 0, position('k1_is_any_member' in d) > 0;
  raise notice 'photo policy: %', (select count(*) from pg_policies where policyname = 'matrimony_read_any_member');
end $$;
