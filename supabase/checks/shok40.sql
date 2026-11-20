do $$
declare su uuid; m record; r record; d date;
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  select x.id, x.family_id into m from public.members x join public.families f on f.id = x.family_id where not x.is_deceased and f.status = 'approved' and f.kind = 'tree' limit 1;
  perform public.shok_member_dob_set(m.id, date '1980-06-15');
  select * into r from public.shok_member_ages(m.family_id) a where a.member_id = m.id; raise notice 'age % can_set %', r.age, r.can_set;
  d := public.shok_member_dob_get(m.id); raise notice 'dob get %', d;
  begin perform public.shok_member_dob_set(m.id, current_date + 3); exception when others then raise notice 'future blocked: %', left(sqlerrm, 40); end;
  perform public.shok_member_dob_set(m.id, null);
  raise notice 'rows after clear: %', (select count(*) from public.member_births where member_id = m.id);
  raise notice 'ages rows with age (profile dob match): %', (select count(*) from public.shok_member_ages(m.family_id) a where a.age is not null);
end $$;
