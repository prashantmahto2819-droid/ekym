-- Welcome message greeting: always a person's name, never the family name.
-- Bug: for the family's main WhatsApp number the queued name was coalesce(contact_name, family_name), so people got
-- "नमस्ते गौतम परिवार जी". Now the sender looks up, at send time, the member who has that number, else the living head,
-- else the contact name; with no name it says just "नमस्ते 🙏". Rows already queued are fixed too.
create or replace function public.trg_family_phone_welcome() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  if coalesce(new.main_whatsapp, '') <> '' and (tg_op = 'INSERT' or new.main_whatsapp is distinct from old.main_whatsapp) and new.status <> 'deleted' then
    perform public.shok_enqueue_phone_welcome(null, new.id, new.main_whatsapp, new.contact_name, 'family_main');
  end if;
  return new;
end $$;

-- clear family names stored as the person in rows not sent yet
update public.shok_phone_welcomes w set person_name = null
  from public.families f where f.id = w.family_id and w.status = 'queued' and w.person_name = f.family_name;

create or replace function public.shok_send_phone_welcomes()
returns int language plpgsql security definer set search_path = 'public' as $$
declare s record; w record; n int := 0; pname text; today_sent int; cap int; msg text; adder text; fam record; cname text; cphone text; body jsonb;
begin
  select max(case when key = 'relay_url' then value end) as url, max(case when key = 'relay_key' then value end) as key,
         max(case when key = 'relay_session' then value end) as sess, max(case when key = 'welcome_enabled' then value end) as enabled,
         max(case when key = 'welcome_contact_name' then value end) as cname, max(case when key = 'welcome_contact_phone' then value end) as cphone,
         max(case when key = 'welcome_daily_cap' then value end) as cap
    into s from public.app_settings;
  if coalesce(s.enabled, 'on') <> 'on' or coalesce(s.url, '') = '' or coalesce(s.key, '') = '' or coalesce(s.sess, '') = '' then return 0; end if;
  cap := coalesce(nullif(s.cap, '')::int, 30);
  select count(*) into today_sent from public.shok_phone_welcomes where status = 'sent' and sent_at > now() - interval '24 hours';
  if today_sent >= cap then return 0; end if;
  cname := coalesce(nullif(s.cname, ''), 'शोकपत्र सेवा');
  cphone := regexp_replace(coalesce(s.cphone, ''), '\D', '', 'g');
  for w in select * from public.shok_phone_welcomes where status = 'queued' and attempts < 3 order by created_at limit least(3, cap - today_sent) loop
    select f.family_name, v.name as village, o.name_hi as org_hi, o.name as org
      into fam from public.families f left join public.villages v on v.id = f.village_id
      left join core.organizations o on o.id = f.organization_id where f.id = w.family_id;
    select full_name into adder from public.profiles where id = w.added_by;
    -- the greeting is always a PERSON: for the family's main number, the member who has that number, else the
    -- (living) head, else the contact name — never the family name
    pname := nullif(btrim(w.person_name), '');
    if w.kind = 'family_main' or pname = fam.family_name then
      select m.name into pname from public.members m
       where m.family_id = w.family_id and not coalesce(m.is_deceased, false) and not coalesce(m.name_unknown, false)
         and (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10)) or m.is_head)
       order by (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10))) desc, m.is_head desc, m.created_at
       limit 1;
      if pname is null then
        select nullif(btrim(f.contact_name), '') into pname from public.families f where f.id = w.family_id;
      end if;
      if pname = fam.family_name then pname := null; end if;
    end if;
    msg := 'नमस्ते ' || case when pname is not null then pname || ' जी ' else '' end || '🙏' || E'\n\n'
        || '"' || coalesce(fam.family_name, 'परिवार') || '"' || case when fam.village is not null then ' (' || fam.village || ')' else '' end
        || ' के वंश वृक्ष में आपका नाम और यह नंबर ' || coalesce(adder, 'परिवार के सदस्य') || ' ने जोड़ा है — '
        || '*Kalchuri One* (kalchuri.org) की शोकपत्र सेवा में, ' || coalesce(fam.org_hi, fam.org, 'समाज') || ' के लिए। Kalchuri One कलचुरी समाज का साझा डिजिटल मंच है; शोकपत्र सेवा उसी की एक सेवा है।' || E'\n'
        || 'समाज के शोक-समाचार / शोकपत्र अब इसी नंबर पर आएँगे।' || E'\n\n'
        || '🙏 कृपया यह नंबर अपने फ़ोन में "' || cname || '" नाम से सेव कर लीजिए'
        || case when cphone <> '' then ' (साथ में कार्ड भेजा है — उसे खोलकर Save दबाइए)' else '' end || ', ताकि संदेश न छूटें।' || E'\n'
        || 'नंबर गलत जुड़ा हो या बदलवाना हो तो यहीं जवाब दीजिए।' || E'\n\n'
        || 'Kalchuri One: https://kalchuri.org' || E'\n' || 'शोकपत्र सेवा: https://shokpatra.kalchuri.org';
    body := jsonb_build_object('to', w.phone, 'text', msg, 'preview', false, 'unique_code', 'ref');
    if cphone <> '' then body := body || jsonb_build_object('then', jsonb_build_array(jsonb_build_object('contact', jsonb_build_object('name', cname, 'phone', cphone)))); end if;
    begin
      perform net.http_post(
        url := rtrim(s.url, '/') || '/api/sessions/' || s.sess || '/send',
        headers := jsonb_build_object('Authorization', 'Bearer ' || s.key, 'Content-Type', 'application/json'),
        body := body, timeout_milliseconds := 20000);
      update public.shok_phone_welcomes set status = 'sent', sent_at = now(), attempts = attempts + 1, error = null where id = w.id;
      n := n + 1;
    exception when others then
      update public.shok_phone_welcomes set attempts = attempts + 1, error = left(sqlerrm, 300), status = case when attempts + 1 >= 3 then 'failed' else 'queued' end where id = w.id;
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.shok_send_phone_welcomes() from public, anon, authenticated;
