-- संपर्क सूची: add a contact as the super admin, check where it shows up (rolled back by db-check).
do $$ declare me uuid; fid uuid; inpicker int; inbrowse int; lst int; hints int; welcome text; begin
  select id into me from public.profiles where coalesce(super_admin, false) order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  fid := public.shok_contact_save(null, 'टेस्ट संपर्क व्यक्ति', '9999900077', 'टेस्टगाँव', 'मूलगाँव', false, 'निजी नोट', null);
  select count(*) into inpicker from public.directory_members(null) where family_id = fid;
  select count(*) into inbrowse from public.directory_families(null) where id = fid;
  select count(*) into lst from public.shok_contacts_list() where family_id = fid and note = 'निजी नोट';
  select count(*) into hints from public.shok_similar_members((select id from public.families where kind = 'tree' and status = 'approved' limit 1)) x where x::text like '%टेस्ट संपर्क%';
  select string_agg(kind || ':' || coalesce(person_name, '-'), ', ') into welcome from public.shok_phone_welcomes where phone = '919999900077';
  raise notice 'CHECK in send picker=% (want 1) | in browse=% (want 0) | in admin list with note=% (want 1) | in hints=% (want 0) | welcome queued=%', inpicker, inbrowse, lst, hints, coalesce(welcome, 'none');
end $$;
