do $$ declare r record; ph int; nw int; nw_ok int; last24 int; resp record; begin
  select count(*) into last24 from public.shok_phone_welcomes where status = 'sent' and sent_at > now() - interval '24 hours';
  raise notice 'SENT last 24h=% (cap 30)', last24;
  -- living, named members in tree families (not deleted) with a phone
  select count(distinct regexp_replace(m.phone, '\D', '', 'g')) into ph from public.members m join public.families f on f.id = m.family_id and f.status <> 'deleted'
   where coalesce(m.phone, '') <> '' and not m.is_deceased and not m.name_unknown;
  select count(distinct regexp_replace(m.phone, '\D', '', 'g')) into nw from public.members m join public.families f on f.id = m.family_id and f.status <> 'deleted'
   where coalesce(m.phone, '') <> '' and not m.is_deceased and not m.name_unknown
     and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(regexp_replace(m.phone, '\D', '', 'g'), 10));
  select count(distinct regexp_replace(m.phone, '\D', '', 'g')) into nw_ok from public.members m join public.families f on f.id = m.family_id and f.status <> 'deleted'
   where coalesce(m.phone, '') <> '' and not m.is_deceased and not m.name_unknown and coalesce(m.whatsapp_ok, true)
     and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(regexp_replace(m.phone, '\D', '', 'g'), 10));
  raise notice 'MEMBER phones=% never_welcomed=% (whatsapp_ok=%)', ph, nw, nw_ok;
  for r in select min(m.created_at) first_added, max(m.created_at) last_added from public.members m join public.families f on f.id = m.family_id and f.status <> 'deleted'
   where coalesce(m.phone, '') <> '' and not m.is_deceased and not m.name_unknown
     and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(regexp_replace(m.phone, '\D', '', 'g'), 10)) loop
    raise notice 'NEVER range % .. %', r.first_added, r.last_added; end loop;
  select count(distinct f.main_whatsapp) into nw from public.families f where f.status <> 'deleted' and coalesce(f.main_whatsapp,'') <> ''
     and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(regexp_replace(f.main_whatsapp, '\D', '', 'g'), 10))
     and not exists (select 1 from public.members m where m.family_id = f.id and right(regexp_replace(coalesce(m.phone,''), '\D', '', 'g'),10) = right(f.main_whatsapp,10));
  raise notice 'FAMILY main numbers never welcomed (not also a member phone)=%', nw;
  for resp in select status_code, count(*) n from net._http_response where created > now() - interval '3 days' group by 1 loop raise notice 'HTTP % x%', resp.status_code, resp.n; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
