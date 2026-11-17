-- निलंबन Kalchuri One संदेशों पर (rolled back by db-check)
do $$ declare me uuid; m record; org uuid; s1 text; s2 text; s3 text; u boolean; begin
  select id into me from public.profiles where coalesce(super_admin, false) order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', me, 'role', 'authenticated')::text, true);
  -- ऐसा सदस्य जिसका नंबर किसी ऐप खाते से मिलता है
  select x.id, x.phone, p.id pid, p.email into m from public.members x
    join public.profiles p on right(regexp_replace(p.phone, '\D', '', 'g'), 10) = right(x.phone, 10)
    join public.families f on f.id = x.family_id and f.status = 'approved'
   where coalesce(x.phone, '') <> '' and not x.is_deceased limit 1;
  if m.id is null then raise notice 'CHECK no member linked to a profile'; return; end if;
  select id into org from core.organizations where slug = 'kalchuri-one';
  perform public.shok_member_suspend(m.id, 'जाँच', null);
  insert into public.comms_messages (organization_id, kind, purpose, to_contact, body) values (org, 'whatsapp', 'utility', m.phone, 'x') returning status into s1;
  insert into public.comms_messages (organization_id, kind, purpose, to_contact, body) values (org, 'whatsapp', 'authentication', m.phone, 'otp') returning status into s2;
  if m.email is not null then insert into public.comms_messages (organization_id, kind, purpose, to_contact, subject, body) values (org, 'email', 'utility', m.email, 's', 'x') returning status into s3; end if;
  u := public.k1_user_suspended(m.pid);
  raise notice 'CHECK whatsapp=% (want blocked) | otp=% (want queued) | email=% (want blocked or null) | user suspended=% (want t)', s1, s2, s3, u;
  perform public.shok_member_resume(m.id, null);
  insert into public.comms_messages (organization_id, kind, purpose, to_contact, body) values (org, 'whatsapp', 'utility', m.phone, 'x') returning status into s1;
  raise notice 'CHECK after resume whatsapp=% (want queued) | user suspended=%', s1, public.k1_user_suspended(m.pid);
exception when others then raise notice 'CHECK ERR % %', sqlstate, sqlerrm; end $$;
