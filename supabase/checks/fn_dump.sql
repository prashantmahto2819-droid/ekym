do $$ declare a uuid; b uuid; n int; begin
  select id into a from public.origin_villages where name = 'पन्तोरा';
  select id into b from public.origin_villages where name = 'पंतोरा';
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where super_admin limit 1), 'role', 'authenticated')::text, true);
  n := public.merge_origin_villages(a, b);
  raise notice 'CHECK merged members=% left=% pantora_now=%', n, (select count(*) from public.origin_villages where id = a), (select count(*) from public.members where origin_village_id = b);
exception when others then raise notice 'CHECK ERR % %', sqlstate, sqlerrm; end $$;
