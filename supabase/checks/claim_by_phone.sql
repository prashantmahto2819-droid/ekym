-- An admin builds a tree with a मुखिया on a number; a pending user with that (OTP-verified) number logs in → family is his.
do $$ declare adm uuid; u uuid; fid uuid; got int; st text; ent int; ph text := '919999900088'; begin
  select id into adm from public.profiles where role = 'admin' and status = 'approved' order by created_at limit 1;
  select id into u from public.profiles where role <> 'admin' and status in ('pending', 'approved') order by created_at desc limit 1;
  update public.profiles set phone = ph, status = 'pending', full_name = coalesce(nullif(full_name, ''), 'टेस्ट यूज़र') where id = u;
  update auth.users set phone = ph, phone_confirmed_at = now() where id = u;
  insert into public.families (family_name, main_whatsapp, owner_id, status, approved_at) values ('टेस्ट वंश', '919999900089', adm, 'approved', now()) returning id into fid;
  insert into public.members (family_id, parent_id, name, relation, is_head, member_kind, phone) values (fid, null, 'टेस्ट मुखिया', 'मुखिया (पिता)', true, 'son', ph);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  got := public.claim_admin_families();
  select status into st from public.profiles where id = u;
  select count(*) into ent from public.shok_my_entries() where family_id = fid and mine;
  raise notice 'CHECK claimed=% (want 1) | owner_is_user=% | user_status=% (want approved) | my_entries mine=% (want 1)',
    got, (select owner_id = u from public.families where id = fid), st, ent;
end $$;
