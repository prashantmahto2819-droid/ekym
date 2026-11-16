do $$ declare r record; begin
  for r in select ro.organization_id, o.name from public.cm_chat_rooms ro join core.organizations o on o.id = ro.organization_id where ro.id = 'c7cd0535-1d8f-439f-8ffb-e9deca204d76' loop
    raise notice 'room org % %', r.organization_id, r.name;
    raise notice 'whatsapp channel for org: %', (select count(*) from public.comms_channels c where c.organization_id = r.organization_id and c.kind = 'whatsapp' and c.status = 'active');
    raise notice 'email channel for org: %', (select count(*) from public.comms_channels c where c.organization_id = r.organization_id and c.kind = 'email' and c.status = 'active');
  end loop;
  raise notice 'saurabh contact phone set: %', (select coalesce(phone,'') <> '' from public.k1_user_contact('d5fc59d2-4dd2-4800-925f-3ab6e978a44c'));
  raise notice 'pick whatsapp: %', public.k1_pick_channel('9aa5c061-65ad-445a-a2ae-85a149756d76', 'whatsapp');
  raise notice 'chat bucket: %', (select count(*) from storage.buckets where id = 'chat');
  raise notice 'cron: %', (select schedule from cron.job where jobname = 'k1-chat-cleanup');
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
