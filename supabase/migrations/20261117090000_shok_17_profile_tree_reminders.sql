-- शोकपत्र सेवा (प्रगतिशील समाज): अधूरे काम की WhatsApp याद — हर व्यक्ति को एक प्रकार की याद 15 दिन में एक बार,
-- ज़्यादा से ज़्यादा 6 बार (लगभग 3 महीने), दिन में 9:40–18:40 के बीच हर घंटे कुछ ही संदेश (नंबर ब्लॉक न हो)।
--   details  = खाता बनाया पर अपनी जानकारी (नाम, गाँव, सहमति) पूरी नहीं भरी
--   tree     = जानकारी भरी / मंज़ूर है, पर न अपना वंश वृक्ष बनाया, न उसका नंबर किसी वंश वृक्ष में दर्ज है
--   tree_draft = वंश वृक्ष शुरू किया पर अधूरा (ड्राफ़्ट / लौटाया गया, 3 दिन से ज़्यादा पुराना)
-- बंद करना हो: app_settings में reminder_enabled = off। एक बार में कितने: reminder_hourly_cap (डिफ़ॉल्ट 5)।
create table if not exists public.shok_reminders (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('details', 'tree', 'tree_draft')),
  last_sent_at timestamptz not null default now(),
  sent_count int not null default 1,
  last_phone text,
  primary key (user_id, kind)
);
alter table public.shok_reminders enable row level security;   -- सिर्फ़ सर्वर

create or replace function public.shok_send_reminders()
returns int language plpgsql security definer set search_path = 'public' as $$
declare s record; c record; n int := 0; cap int; msg text; app text := 'https://shokpatra.kalchuri.org/app.html';
begin
  select max(case when key = 'relay_url' then value end) as url, max(case when key = 'relay_key' then value end) as key,
         max(case when key = 'relay_session' then value end) as sess, max(case when key = 'reminder_enabled' then value end) as enabled,
         max(case when key = 'reminder_hourly_cap' then value end) as cap
    into s from public.app_settings;
  if coalesce(s.enabled, 'on') <> 'on' or coalesce(s.url, '') = '' or coalesce(s.key, '') = '' or coalesce(s.sess, '') = '' then return 0; end if;
  cap := greatest(1, least(coalesce(nullif(s.cap, '')::int, 5), 30));

  for c in
    with base as (
      select p.id, nullif(btrim(p.full_name), '') as name, p.status, p.details_done_at, p.created_at,
             regexp_replace(coalesce(nullif(p.phone, ''), u.phone, ''), '\D', '', 'g') as ph
        from public.profiles p join auth.users u on u.id = p.id
       where p.status <> 'rejected'),
    cand as (
      -- 1) अधूरी जानकारी
      select b.id, b.name, b.ph, 'details'::text as kind, null::text as fam, 0 as cnt from base b
       where b.details_done_at is null and b.created_at < now() - interval '1 day'
      union all
      -- 2) जानकारी पूरी, पर कोई वंश वृक्ष नहीं (न अपना, न किसी में नंबर दर्ज)
      select b.id, b.name, b.ph, 'tree', null, 0 from base b
       where b.details_done_at is not null and b.details_done_at < now() - interval '2 days'
         and not exists (select 1 from public.families f where f.owner_id = b.id and f.status <> 'deleted' and f.kind = 'tree')
         and not exists (select 1 from public.members m join public.families f on f.id = m.family_id
                          where f.status <> 'deleted' and f.kind = 'tree' and length(b.ph) >= 10
                            and right(regexp_replace(coalesce(m.phone, ''), '\D', '', 'g'), 10) = right(b.ph, 10))
         and not exists (select 1 from public.families f where f.status <> 'deleted' and f.kind = 'tree' and length(b.ph) >= 10
                            and right(regexp_replace(coalesce(f.main_whatsapp, ''), '\D', '', 'g'), 10) = right(b.ph, 10))
      union all
      -- 3) अधूरा वंश वृक्ष (ड्राफ़्ट / लौटाया गया)
      select b.id, b.name, b.ph, 'tree_draft', f.family_name, (select count(*)::int from public.members m where m.family_id = f.id) from base b
        join lateral (select f.* from public.families f where f.owner_id = b.id and f.kind = 'tree' and f.status in ('draft', 'rejected')
                        and f.created_at < now() - interval '3 days' order by f.created_at limit 1) f on true
       where b.details_done_at is not null)
    select cand.* from cand
      left join public.shok_reminders r on r.user_id = cand.id and r.kind = cand.kind
     where length(cand.ph) >= 10 and (r.user_id is null or (r.last_sent_at < now() - interval '15 days' and r.sent_count < 6))
     order by r.last_sent_at nulls first
     limit cap
  loop
    msg := 'नमस्ते ' || coalesce(c.name || ' जी ', '') || '🙏' || E'\n\n' ||
      case c.kind
        when 'details' then 'आपने *शोकपत्र सेवा* (प्रगतिशील जायसवाल कन्नौजिया कलार समाज) में खाता बनाया है, पर आपकी जानकारी अभी अधूरी है। '
             || 'कृपया 2 मिनट निकालकर अपना नाम, पिता का नाम और गाँव भर दीजिए — तभी आपका खाता मंज़ूर होगा और आप अपना वंश वृक्ष बना सकेंगे।' || E'\n\n👉 ' || app
        when 'tree' then 'आपका *वंश वृक्ष* अभी शोकपत्र सेवा में नहीं बना है। मुखिया, पूर्वज, पत्नी, पुत्र-पुत्री जोड़कर अपना वंश वृक्ष बनाइए — '
             || 'इसी से समाज के शोक समाचार और निमंत्रण आपके परिवार तक सही ढंग से पहुँचेंगे।' || E'\n\n👉 ' || app || '#/families'
        else 'आपका वंश वृक्ष "' || coalesce(c.fam, 'परिवार') || '" अभी अधूरा है (' || c.cnt || ' सदस्य) और मंज़ूरी के लिए नहीं भेजा गया। '
             || 'बाकी सदस्य जोड़कर "मंज़ूरी के लिए भेजें" दबाइए।' || E'\n\n👉 ' || app || '#/families'
      end
      || E'\n\n' || 'यह याद 15 दिन में एक बार आती है। मदद चाहिए या ऐसे संदेश नहीं चाहिए, तो यहीं जवाब दीजिए। 🙏';
    begin
      perform net.http_post(
        url := rtrim(s.url, '/') || '/api/sessions/' || s.sess || '/send',
        headers := jsonb_build_object('Authorization', 'Bearer ' || s.key, 'Content-Type', 'application/json'),
        body := jsonb_build_object('to', case when length(c.ph) = 10 then '91' || c.ph else c.ph end, 'text', msg, 'preview', false, 'unique_code', 'ref'),
        timeout_milliseconds := 20000);
      insert into public.shok_reminders (user_id, kind, last_sent_at, sent_count, last_phone) values (c.id, c.kind, now(), 1, c.ph)
      on conflict (user_id, kind) do update set last_sent_at = now(), sent_count = shok_reminders.sent_count + 1, last_phone = excluded.last_phone;
      n := n + 1;
    exception when others then null;
    end;
  end loop;
  return n;
end $$;
revoke all on function public.shok_send_reminders() from public, anon, authenticated;

-- हर घंटे, 9:40 से 18:40 (IST) तक
do $$ begin perform cron.unschedule('shok-reminders'); exception when others then null; end $$;
select cron.schedule('shok-reminders', '10 4-13 * * *', $$select public.shok_send_reminders()$$);

-- एडमिन के लिए: किसे कितनी याद गई (शोकपत्र "यूज़र" पेज के लिए)
create or replace function public.shok_reminder_log()
returns table (user_id uuid, kind text, last_sent_at timestamptz, sent_count int)
language sql stable security definer set search_path = 'public' as $$
  select r.user_id, r.kind, r.last_sent_at, r.sent_count from public.shok_reminders r where public.is_admin();
$$;
revoke all on function public.shok_reminder_log() from public, anon;
grant execute on function public.shok_reminder_log() to authenticated;
