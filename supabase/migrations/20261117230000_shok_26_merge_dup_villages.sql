-- मालिक के कहने पर (2026-11-17) निवास के दोहराए गाँव मिलाए: पन्तोरा→पंतोरा, मनगांव दीपका→मनगांव, दीपका, DIPKA→दीपका, ऐंटिपिसि→एन टी पी सी
do $$
declare sa uuid; p record; a uuid; b uuid; res jsonb;
begin
  select id into sa from public.profiles where super_admin order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated')::text, true);
  for p in select * from (values ('पन्तोरा', 'पंतोरा'), ('मनगांव दीपका', 'मनगांव, दीपका'), ('DIPKA', 'दीपका'), ('ऐंटिपिसि', 'एन टी पी सी')) v(f, t) loop
    select id into a from public.villages where name = p.f;
    select id into b from public.villages where name = p.t;
    if a is null or b is null then raise notice 'skip % -> %', p.f, p.t; continue; end if;
    res := public.merge_villages(a, b);
    raise notice 'merged % -> %: %', p.f, p.t, res;
  end loop;
end $$;
