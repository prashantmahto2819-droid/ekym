do $$
declare su uuid; j jsonb;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  j := public.shok_report(public.shok_home_org());
  raise notice 'report: %', j - 'villages' - 'letters' - 'months';
  raise notice 'villages %, letters %, months %', jsonb_array_length(j -> 'villages'), jsonb_array_length(j -> 'letters'), j -> 'months';
  raise notice 'first village: %', j -> 'villages' -> 0;
  raise notice 'punyatithi rows: %', (select count(*) from public.shok_upcoming_punyatithi_org(public.shok_home_org(), 30));
end $$;
