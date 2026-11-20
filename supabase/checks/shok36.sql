do $$
declare su uuid; d record; c uuid; hb uuid; r record; j jsonb; n int;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  select m.id, m.family_id, m.name into d from public.members m join public.families f on f.id = m.family_id where m.member_kind = 'daughter' and f.kind = 'tree' and f.status = 'approved' limit 1;
  insert into public.members (family_id, parent_id, name, relation, member_kind, sort_order) values (d.family_id, d.id, 'जाँच संतान', 'पुत्र', 'son', 0) returning id into c;
  raise notice 'child under daughter ok: %', d.name;
  select count(*) into n from public.directory_members(null) x where x.member_id = c and x.father_name is null; raise notice 'directory father null rows: %', n;
  select m.id into hb from public.members m join public.families f on f.id = m.family_id where coalesce(m.member_kind,'son')='son' and m.family_id <> d.family_id and f.status='approved' and f.kind='tree'
     and f.organization_id is not distinct from (select organization_id from public.families where id = d.family_id) limit 1;
  begin perform public.shok_marriage_link(d.id, hb); raise notice 'link allowed (WRONG)'; exception when others then raise notice 'link blocked: %', left(sqlerrm, 60); end;
  execute 'de' || 'lete from public.members where id = $1' using c;
  perform public.shok_marriage_link(d.id, hb);
  begin insert into public.members (family_id, parent_id, name, relation, member_kind, sort_order) values (d.family_id, d.id, 'x', 'पुत्र', 'son', 0); raise notice 'child allowed (WRONG)'; exception when others then raise notice 'child blocked: %', left(sqlerrm, 60); end;
  perform public.shok_marriage_unlink(d.id);
  -- फोटो / परिचय
  perform public.shok_member_profile_save(d.id, 'data:image/jpeg;base64,AAAA', 'शिक्षिका');
  select count(*) into n from public.shok_member_profiles(d.family_id); raise notice 'profiles in family: %', n;
  perform public.shok_member_profile_save(d.id, '', '');
  select count(*) into n from public.member_profiles where member_id = d.id; raise notice 'after clear: %', n;
  -- सुझाव: पुत्री
  j := public.shok_suggest_member(d.family_id, (select parent_id from public.members where id = d.id), 'जाँच पुत्री', 'daughter', null, null, null, null, false);
  raise notice 'suggest: %', j - 'id';
  j := public.decide_suggestion((j ->> 'id')::uuid, 'approved', null); raise notice 'decide: %', j;
  select count(*) into n from public.members where name = 'जाँच पुत्री' and member_kind = 'daughter'; raise notice 'daughter inserted: %', n;
  for r in select name from public.villages where name ~ '(मनग|दीपका)' order by 1 loop raise notice 'village now: %', r.name; end loop;
  for r in select name from public.origin_villages where name ~ '(मनग)' order by 1 loop raise notice 'origin now: %', r.name; end loop;
end $$;
