-- मालिक के कहने पर (2026-11-20) मूल ग्राम मिलाए: मनगांव लक्ष्मण नगर → मनगांव, दीपका बस्ती → दीपका
do $$
declare sa uuid; p record; a uuid; b uuid; n int;
begin
  select id into sa from public.profiles where super_admin order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated')::text, true);
  for p in select * from (values ('मनगांव लक्ष्मण नगर', 'मनगांव'), ('दीपका बस्ती', 'दीपका')) v(f, t) loop
    select id into a from public.origin_villages where name = p.f;
    select id into b from public.origin_villages where name = p.t;
    if a is null or b is null then raise notice 'skip % -> %', p.f, p.t; continue; end if;
    n := public.merge_origin_villages(a, b);
    raise notice 'merged % -> % (% members)', p.f, p.t, n;
  end loop;
end $$;
