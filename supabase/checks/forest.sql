do $$
declare su uuid; j jsonb; o uuid;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  o := public.shok_home_org();
  j := public.shok_forest(o);
  raise notice 'home org: members %, links %, families %', jsonb_array_length(j -> 'members'), jsonb_array_length(j -> 'links'), (select count(distinct x ->> 'family_id') from jsonb_array_elements(j -> 'members') x);
  raise notice 'keys: %', (select string_agg(k, ',') from jsonb_object_keys(j -> 'members' -> 0) k);
  for o in select id from core.organizations where id <> public.shok_home_org() limit 3 loop
    raise notice 'other org members: %', jsonb_array_length(public.shok_forest(o) -> 'members');
  end loop;
end $$;
