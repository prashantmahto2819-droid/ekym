-- स्वागत संदेश: (1) दिन की सीमा 30 → 200 (मालिक: Vivid Relay में 1000/दिन की सीमा है; बाकी पत्रों के लिए बचे)
-- (2) 9 नवंबर से पहले जुड़े जिन नंबरों को कभी स्वागत संदेश नहीं गया, उन्हें कतार में डालें (धीरे-धीरे: हर 2 मिनट 3)
-- (3) निलंबित सदस्य के नंबर पर स्वागत संदेश नहीं

update public.app_settings set value = '200' where key = 'welcome_daily_cap' and coalesce(nullif(value, '')::int, 30) < 200;

create or replace function public.shok_enqueue_phone_welcome(p_member uuid, p_family uuid, p_phone text, p_name text, p_kind text)
returns void language plpgsql security definer set search_path = 'public' as $$
declare ph text;
begin
  if coalesce((select value from public.app_settings where key = 'welcome_enabled'), 'on') <> 'on' then return; end if;
  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(ph) < 10 then return; end if;
  if length(ph) = 10 then ph := '91' || ph; end if;
  if public.shok_phone_suspended(ph) then return; end if;
  if exists (select 1 from public.shok_phone_welcomes w where w.phone = ph and w.status in ('queued', 'sent') and w.created_at > now() - interval '180 days') then return; end if;
  insert into public.shok_phone_welcomes (member_id, family_id, phone, person_name, kind, added_by)
  values (p_member, p_family, ph, nullif(btrim(p_name), ''), p_kind, auth.uid());
end $$;

-- पुराने नंबर: सदस्य (जीवित, नाम दर्ज, WhatsApp चलता है)
insert into public.shok_phone_welcomes (member_id, family_id, phone, person_name, kind, added_by, created_at)
select distinct on (x.ph) x.mid, x.fid, x.ph, x.name, 'member', x.owner, now()
  from (select m.id mid, f.id fid, m.name, f.owner_id owner, m.created_at,
               case when length(regexp_replace(m.phone, '\D', '', 'g')) = 10 then '91' || regexp_replace(m.phone, '\D', '', 'g') else regexp_replace(m.phone, '\D', '', 'g') end ph
          from public.members m join public.families f on f.id = m.family_id and f.status <> 'deleted'
         where coalesce(m.phone, '') <> '' and not m.is_deceased and not m.name_unknown and coalesce(m.whatsapp_ok, true)) x
 where length(x.ph) >= 12 and not public.shok_phone_suspended(x.ph)
   and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(x.ph, 10))
 order by x.ph, x.created_at;

-- पुराने नंबर: परिवार का मुख्य WhatsApp
insert into public.shok_phone_welcomes (member_id, family_id, phone, person_name, kind, added_by, created_at)
select distinct on (x.ph) null, x.fid, x.ph, x.pname, 'family_main', x.owner, now()
  from (select f.id fid, coalesce(f.contact_name, f.family_name) pname, f.owner_id owner, f.created_at,
               case when length(regexp_replace(f.main_whatsapp, '\D', '', 'g')) = 10 then '91' || regexp_replace(f.main_whatsapp, '\D', '', 'g') else regexp_replace(f.main_whatsapp, '\D', '', 'g') end ph
          from public.families f
         where f.status <> 'deleted' and coalesce(f.main_whatsapp, '') <> '' and coalesce(f.main_whatsapp_ok, true)) x
 where length(x.ph) >= 12 and not public.shok_phone_suspended(x.ph)
   and not exists (select 1 from public.shok_phone_welcomes w where right(w.phone, 10) = right(x.ph, 10))
 order by x.ph, x.created_at;
