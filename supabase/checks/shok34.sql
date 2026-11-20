do $$
declare su uuid; d record; hb record; t jsonb; st text; r record; n int;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  -- विवाह की कड़ी
  select m.id, m.family_id, m.name into d from public.members m join public.families f on f.id = m.family_id where m.member_kind = 'daughter' and f.kind = 'tree' and f.status = 'approved' limit 1;
  select m.id, m.family_id, m.name into hb from public.members m join public.families f on f.id = m.family_id
   where coalesce(m.member_kind,'son') = 'son' and not m.is_deceased and f.kind = 'tree' and f.status = 'approved' and m.family_id <> d.family_id
     and f.organization_id is not distinct from (select organization_id from public.families where id = d.family_id) limit 1;
  raise notice 'daughter % husband %', d.name, hb.name;
  if d.id is not null and hb.id is not null then
    perform public.shok_marriage_link(d.id, hb.id);
    select count(*) into n from public.shok_marriage_links(null); raise notice 'marriage links all: %', n;
    select count(*) into n from public.shok_marriage_links(hb.family_id); raise notice 'marriage links for husband family: %', n;
    perform public.shok_marriage_unlink(d.id);
    select count(*) into n from public.marriage_links; raise notice 'after unlink: %', n;
  end if;
  -- इतिहास
  update public.members set name = name || ' ज़' where id = hb.id;
  update public.members set is_deceased = true, death_date = current_date - 10 where id = hb.id;
  for r in select * from public.shok_family_history(hb.family_id, 3) loop raise notice 'history: % | % | %', r.actor_name, r.action, r.summary; end loop;
  -- श्रद्धांजलि
  t := public.shok_tribute_save(null, jsonb_build_object('name', 'स्व. परीक्षण', 'death_date', '2026-11-01', 'place', 'खैरागढ़', 'about', 'जाँच'));
  raise notice 'tribute %', t;
  st := public.shok_tribute_post(t ->> 'slug', 'रमेश', 'दुर्ग', 'विनम्र श्रद्धांजलि'); raise notice 'post by approved user: %', st;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  st := public.shok_tribute_post(t ->> 'slug', 'अनजान', null, 'ॐ शांति'); raise notice 'post by visitor: %', st;
  raise notice 'public: %', (select jsonb_array_length(public.shok_tribute_public(t ->> 'slug') -> 'messages'));
  begin perform public.shok_tribute_post(t ->> 'slug', 'x', null, 'देखें http://spam.example'); exception when others then raise notice 'link blocked: %', sqlerrm; end;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  raise notice 'list: %', (select jsonb_agg(x - 'id' - 'slug' - 'created_at') from jsonb_array_elements(public.shok_tributes_list()) x where x ->> 'name' = 'स्व. परीक्षण');
  -- घंटी
  select count(*) into n from public.shok_notifications where user_id = su; raise notice 'bell rows for super: %', n;
  perform public.shok_notify(su, 'info', 'जाँच', null, null);
  select count(*) into n from public.shok_notifications where user_id = su; raise notice 'bell rows after: %', n;
end $$;
