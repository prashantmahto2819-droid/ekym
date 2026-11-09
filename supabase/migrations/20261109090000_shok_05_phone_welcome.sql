-- शोकपत्र (owner, 2026-11-09): when a phone number is added to a family tree (member's number, or the family's main number
-- when an admin creates a family for someone), that person gets ONE WhatsApp: who added them to which tree, that shok letters
-- will come on this number, and a request to save our number — with our contact card attached (one tap to save).
-- Sent slowly from a queue (pg_cron every 2 min, few per run, daily cap) so the gateway is not flagged. Additive only.

insert into public.app_settings (key, value) values
  ('welcome_enabled', 'on'),
  ('welcome_contact_name', 'शोकपत्र सेवा'),
  ('welcome_contact_phone', ''),
  ('welcome_daily_cap', '30')
on conflict (key) do nothing;

create table if not exists public.shok_phone_welcomes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  family_id uuid references public.families(id) on delete cascade,
  phone text not null,
  person_name text,
  kind text not null default 'member' check (kind in ('member', 'family_main')),
  added_by uuid references auth.users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists shok_phone_welcomes_phone_idx on public.shok_phone_welcomes (phone, created_at desc);
create index if not exists shok_phone_welcomes_status_idx on public.shok_phone_welcomes (status, created_at);
alter table public.shok_phone_welcomes enable row level security;
drop policy if exists shok_phone_welcomes_admin_read on public.shok_phone_welcomes;
create policy shok_phone_welcomes_admin_read on public.shok_phone_welcomes for select to authenticated using (public.is_admin());

-- queue one welcome (skips: feature off, short number, same number welcomed/queued within 180 days)
create or replace function public.shok_enqueue_phone_welcome(p_member uuid, p_family uuid, p_phone text, p_name text, p_kind text)
returns void language plpgsql security definer set search_path = 'public' as $$
declare ph text;
begin
  if coalesce((select value from public.app_settings where key = 'welcome_enabled'), 'on') <> 'on' then return; end if;
  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(ph) < 10 then return; end if;
  if length(ph) = 10 then ph := '91' || ph; end if;
  if exists (select 1 from public.shok_phone_welcomes w where w.phone = ph and w.status in ('queued', 'sent') and w.created_at > now() - interval '180 days') then return; end if;
  insert into public.shok_phone_welcomes (member_id, family_id, phone, person_name, kind, added_by)
  values (p_member, p_family, ph, nullif(btrim(p_name), ''), p_kind, auth.uid());
end $$;

create or replace function public.trg_member_phone_welcome() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  if coalesce(new.phone, '') <> '' and (tg_op = 'INSERT' or new.phone is distinct from old.phone)
     and coalesce(new.whatsapp_ok, true) and not coalesce(new.name_unknown, false) and not coalesce(new.is_deceased, false) then
    perform public.shok_enqueue_phone_welcome(new.id, new.family_id, new.phone, new.name, 'member');
  end if;
  return new;
end $$;
drop trigger if exists trg_member_phone_welcome on public.members;
create trigger trg_member_phone_welcome after insert or update of phone on public.members
  for each row execute function public.trg_member_phone_welcome();

create or replace function public.trg_family_phone_welcome() returns trigger
language plpgsql security definer set search_path = 'public' as $$
begin
  if coalesce(new.main_whatsapp, '') <> '' and (tg_op = 'INSERT' or new.main_whatsapp is distinct from old.main_whatsapp) and new.status <> 'deleted' then
    perform public.shok_enqueue_phone_welcome(null, new.id, new.main_whatsapp, coalesce(new.contact_name, new.family_name), 'family_main');
  end if;
  return new;
end $$;
drop trigger if exists trg_family_phone_welcome on public.families;
create trigger trg_family_phone_welcome after insert or update of main_whatsapp on public.families
  for each row execute function public.trg_family_phone_welcome();

-- the sender (pg_cron every 2 min): a few per run, daily cap, text + our contact card via Vivid Relay (same gateway as letters)
create or replace function public.shok_send_phone_welcomes()
returns int language plpgsql security definer set search_path = 'public' as $$
declare s record; w record; n int := 0; today_sent int; cap int; msg text; adder text; fam record; cname text; cphone text; body jsonb;
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
    msg := 'नमस्ते ' || coalesce(w.person_name, '') || ' जी 🙏' || E'\n\n'
        || '"' || coalesce(fam.family_name, 'परिवार') || '"' || case when fam.village is not null then ' (' || fam.village || ')' else '' end
        || ' के वंश वृक्ष में आपका नाम और यह नंबर ' || coalesce(adder, 'परिवार के सदस्य') || ' ने जोड़ा है — '
        || coalesce(fam.org_hi, fam.org, 'शोकपत्र सेवा') || ' की शोकपत्र सेवा में।' || E'\n'
        || 'समाज के शोक-समाचार / शोकपत्र अब इसी नंबर पर आएँगे।' || E'\n\n'
        || '🙏 कृपया यह नंबर अपने फ़ोन में "' || cname || '" नाम से सेव कर लीजिए'
        || case when cphone <> '' then ' (साथ में कार्ड भेजा है — उसे खोलकर Save दबाइए)' else '' end || ', ताकि संदेश न छूटें।' || E'\n'
        || 'नंबर गलत जुड़ा हो या बदलवाना हो तो यहीं जवाब दीजिए।' || E'\n' || 'https://shokpatra.kalchuri.org';
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

-- admin: queue summary + manual "send now" (for the settings page)
create or replace function public.shok_phone_welcome_stats()
returns jsonb language sql stable security definer set search_path = 'public' as $$
  select case when public.is_admin() then jsonb_build_object(
    'queued', (select count(*) from public.shok_phone_welcomes where status = 'queued'),
    'sent_24h', (select count(*) from public.shok_phone_welcomes where status = 'sent' and sent_at > now() - interval '24 hours'),
    'sent_total', (select count(*) from public.shok_phone_welcomes where status = 'sent'),
    'failed', (select count(*) from public.shok_phone_welcomes where status = 'failed'))
  else null end;
$$;
grant execute on function public.shok_phone_welcome_stats() to authenticated;

create or replace function public.shok_phone_welcome_kick()
returns int language plpgsql security definer set search_path = 'public' as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return public.shok_send_phone_welcomes();
end $$;
grant execute on function public.shok_phone_welcome_kick() to authenticated;

-- timer
do $$ begin
  perform cron.unschedule('shokpatra-phone-welcome');
exception when others then null; end $$;
select cron.schedule('shokpatra-phone-welcome', '*/2 * * * *', $$select public.shok_send_phone_welcomes()$$);
