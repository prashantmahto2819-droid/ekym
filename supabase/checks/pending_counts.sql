do $$ declare uid uuid; begin
  select id into uid from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  raise notice 'stats: %', public.dashboard_stats();
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
