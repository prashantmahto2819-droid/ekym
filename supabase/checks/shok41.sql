do $$
declare su uuid; par uuid; r record; ids uuid[];
begin
  select id into su from public.profiles where super_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', su, 'role', 'authenticated')::text, true);
  select m.parent_id into par from public.members m join public.families f on f.id = m.family_id
   where m.parent_id is not null and coalesce(m.member_kind,'son') = 'son' and f.status = 'approved' group by m.parent_id having count(*) >= 3 limit 1;
  select array_agg(id order by sort_order, created_at) into ids from public.members where parent_id = par and coalesce(member_kind,'son') = 'son';
  for r in select name, sort_order, coalesce(member_kind,'son') k from public.members where parent_id = par order by sort_order, created_at loop raise notice 'before: % % %', r.sort_order, r.k, r.name; end loop;
  perform public.shok_member_birth_set(ids[1], date '1990-01-01', null);  -- पहला सबसे छोटा
  perform public.shok_member_birth_set(ids[3], null, 50);                 -- तीसरा सबसे बड़ा (उम्र से)
  for r in select name, sort_order, coalesce(member_kind,'son') k from public.members where parent_id = par order by sort_order, created_at loop raise notice 'after: % % %', r.sort_order, r.k, r.name; end loop;
  raise notice 'get approx: %', public.shok_member_birth_get(ids[3]);
  raise notice 'get exact: %', public.shok_member_birth_get(ids[1]);
  for r in select a.age, a.approx from public.shok_member_ages((select family_id from public.members where id = ids[1])) a where a.age is not null loop raise notice 'age % approx %', r.age, r.approx; end loop;
end $$;
