-- सदस्यता निलंबन जाँच (rolled back by db-check)
do $$ declare me uuid; m record; n record; lid uuid; c1 int; c2 int; d1 text; d2 text; nv1 text; nv2 text; g timestamptz; begin
  select id into me from public.profiles where coalesce(super_admin, false) order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  -- एक सदस्य जिसके नंबर से किसी और का पत्र जाता है
  select x.id, x.name, x.phone, y.id oid into m from public.members x
    join public.families f on f.id = x.family_id and f.status = 'approved' and f.kind = 'tree'
    join public.members y on y.family_id = x.family_id and y.id <> x.id and not y.is_deceased and not y.name_unknown
    join lateral public.shok_deliver_phone(y.id, 'each_member') d on d.via_member_id = x.id
   where coalesce(x.phone, '') <> '' and not x.is_deceased limit 1;
  if m.id is null then raise notice 'CHECK no routed member found'; return; end if;
  select phone into d1 from public.shok_deliver_phone(m.id, 'each_member');
  select coalesce(via_name, '-') || ' ' || phone into nv1 from public.shok_deliver_phone(m.oid, 'each_member');
  perform public.shok_member_suspend(m.id, 'जाँच', null);
  select phone into d2 from public.shok_deliver_phone(m.id, 'each_member');
  select coalesce(via_name, '-') || ' ' || phone into nv2 from public.shok_deliver_phone(m.oid, 'each_member');
  insert into public.letters (created_by, deceased_name, status, send_mode) values (me, 'जाँच', 'draft', 'each_member') returning id into lid;
  select count(*) into c1 from public.create_letter_recipients(lid, array[m.id], true);
  select count(*) into c2 from public.create_letter_recipients(lid, array[m.oid], true);
  raise notice 'CHECK member own phone before=% after=% (want null) | other member route before=[%] after=[%] (must not use %) | letter rows suspended=% (want 0) other=%', d1, d2, nv1, nv2, m.phone, c1, c2;
  update public.members set suspended_at = null where id = m.id;
  select suspended_at into g from public.members where id = m.id;
  raise notice 'CHECK direct update kept suspension=% (want not null) | in send picker=% | flagged=%', g is not null,
    (select count(*) from public.directory_members(null) where member_id = m.id), (select count(*) from public.shok_suspended_members() where member_id = m.id);
  perform public.shok_member_resume(m.id, 'ठीक');
  select phone into d2 from public.shok_deliver_phone(m.id, 'each_member');
  raise notice 'CHECK after resume own phone=% | log rows=%', d2 is not null, (select count(*) from public.shok_member_suspension_log(m.id));
exception when others then raise notice 'CHECK ERR % %', sqlstate, sqlerrm; end $$;
