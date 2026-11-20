do $$
declare m uuid; n int; r record;
begin
  select m2.id into m from public.members m2 join public.families f on f.id = m2.family_id where m2.is_deceased and not m2.name_unknown and f.status = 'approved' and f.kind = 'tree' limit 1;
  update public.members set death_date = (current_date + 5 - interval '3 years')::date where id = m;
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from public.profiles where super_admin limit 1), 'role', 'authenticated')::text, true);
  for r in select * from public.shok_upcoming_punyatithi(30) loop
    raise notice 'punyatithi: % next % years %', r.name, r.next_date, r.years;
  end loop;
  select count(*) into n from public.app_settings where key = 'relay_session_backup';
  raise notice 'backup setting rows: %', n;
end $$;
