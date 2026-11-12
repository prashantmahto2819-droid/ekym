-- Kalchuri One (owner, 2026-11-12): member broadcasts + automatic alerts.
-- * k1_broadcast_create: an organisation sends an announcement / event / any notice to its members — always into the bell,
--   optionally WhatsApp and/or email. Recipients are queued (k1_broadcast_queue) and a cron job sends 25 a minute through
--   k1_notify_user2 (respects each member's WhatsApp/email switches and quiet hours) so the gateway is never flooded.
-- * Blood: when a requirement becomes verified/active, compatible eligible donors (same district first, then state) are
--   alerted automatically (WhatsApp + bell), max 60 per requirement.
-- * Events: guests who said yes / have not answered get an automatic WhatsApp reminder the day before (18:00 IST) and on
--   the morning of the event (07:30 IST) — once each.
-- Applied via MCP. Additive only.

-- notify with per-call channel switches (k1_notify_user keeps its signature and calls this)
create or replace function public.k1_notify_user2(p_org uuid, p_user uuid, p_subject text, p_body text, p_link text default null, p_ref_table text default null, p_ref uuid default null,
                                                  p_email boolean default true, p_whatsapp boolean default true, p_kind text default 'system')
returns integer language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0; url text; txt text; pr public.k1_notification_prefs;
begin
  begin
    insert into public.cm_notifications (organization_id, user_id, kind, text, link)
    values (p_org, p_user, coalesce(p_kind, 'system'), left(p_subject || coalesce(' — ' || p_body, ''), 400), p_link);
  exception when others then null; end;
  if not (p_email or p_whatsapp) then return 0; end if;
  select * into c from public.k1_user_contact(p_user);
  if c is null then return 0; end if;
  select * into pr from public.k1_notification_prefs where user_id = p_user;
  url := case when p_link is null then '' when p_link like 'http%' then p_link else (select coalesce('https://' || d.hostname, 'https://kalchuri.org') from core.org_domains d where d.organization_id = p_org and d.is_primary order by d.created_at limit 1) || p_link end;
  if url is null then url := 'https://kalchuri.org' || p_link; end if;
  txt := p_subject || E'\n\n' || p_body || case when url <> '' then E'\n' || url else '' end;
  if p_email and coalesce(pr.email, true) and public.k1_send(p_org, 'email', c.email, c.full_name, p_subject, p_body || case when url <> '' then E'\n\n' || url else '' end, p_ref_table, p_ref) then n := n + 1; end if;
  if p_whatsapp and coalesce(pr.whatsapp, true) and coalesce(c.phone, '') <> '' then
    if public.k1_in_quiet_hours(p_user) then
      insert into public.k1_deferred_whatsapp (organization_id, user_id, phone, full_name, body, ref_table, ref) values (p_org, p_user, c.phone, c.full_name, txt, p_ref_table, p_ref);
      n := n + 1;
    elsif public.k1_send(p_org, 'whatsapp', c.phone, c.full_name, null, txt, p_ref_table, p_ref) then n := n + 1; end if;
  end if;
  return n;
end $$;
revoke execute on function public.k1_notify_user2(uuid, uuid, text, text, text, text, uuid, boolean, boolean, text) from public, anon, authenticated;

create or replace function public.k1_notify_user(p_org uuid, p_user uuid, p_subject text, p_body text, p_link text default null, p_ref_table text default null, p_ref uuid default null)
returns integer language sql security definer set search_path = '' as $$
  select public.k1_notify_user2(p_org, p_user, p_subject, p_body, p_link, p_ref_table, p_ref, true, true,
                                case when p_ref_table = 'org_memberships_renewal' then 'renewal' else 'system' end);
$$;

alter table public.cm_notifications drop constraint if exists cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention','chat_dm','birthday','anniversary','wish','friend_request','friend_accept','system','renewal','announcement','event','blood'));

-- ---------- broadcasts ----------
create table if not exists public.k1_broadcasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null default 'announcement' check (kind in ('announcement', 'event', 'blood', 'general')),
  ref_table text, ref uuid,
  title text not null, body text not null, link text,
  email boolean not null default false, whatsapp boolean not null default false,
  audience jsonb not null default '{}'::jsonb,         -- {include_children:bool, district:text, gender:text, category:text}
  status text not null default 'queued' check (status in ('queued', 'sending', 'done', 'cancelled')),
  total int not null default 0, sent int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), finished_at timestamptz
);
create table if not exists public.k1_broadcast_queue (
  broadcast_id uuid not null references public.k1_broadcasts(id) on delete cascade,
  user_id uuid not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'skipped')),
  sent_at timestamptz,
  primary key (broadcast_id, user_id)
);
create index if not exists k1_broadcast_queue_q_idx on public.k1_broadcast_queue (status, broadcast_id);
alter table public.k1_broadcasts enable row level security;
alter table public.k1_broadcast_queue enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists k1_broadcasts_read on public.k1_broadcasts'; end $x$;
create policy k1_broadcasts_read on public.k1_broadcasts for select to authenticated using (core.can(organization_id, 'org.settings.edit') or core.can(organization_id, 'community.listing.moderate'));

-- who would receive it (count only, for the dialog)
create or replace function public.k1_broadcast_audience(p_org uuid, p_audience jsonb)
returns table (user_id uuid) language sql stable security definer set search_path = '' as $$
  select distinct m.user_id from public.org_memberships m
   where m.status = 'active' and m.user_id is not null
     and (m.organization_id = p_org or (coalesce((p_audience->>'include_children')::boolean, false)
          and m.organization_id in (select t.descendant_id from core.org_tree t where t.ancestor_id = p_org)))
     and (coalesce(p_audience->>'district', '') = '' or m.district ilike p_audience->>'district')
     and (coalesce(p_audience->>'gender', '') = '' or m.gender = p_audience->>'gender')
     and (coalesce(p_audience->>'category', '') = '' or m.category = p_audience->>'category');
$$;
revoke execute on function public.k1_broadcast_audience(uuid, jsonb) from public, anon, authenticated;

create or replace function public.k1_broadcast_count(p_org uuid, p_audience jsonb default '{}'::jsonb)
returns int language plpgsql stable security definer set search_path = '' as $$
begin
  if not (core.can(p_org, 'org.settings.edit') or core.can(p_org, 'community.listing.moderate')) then raise exception 'not allowed'; end if;
  return (select count(*)::int from public.k1_broadcast_audience(p_org, coalesce(p_audience, '{}'::jsonb)));
end $$;
grant execute on function public.k1_broadcast_count(uuid, jsonb) to authenticated;

create or replace function public.k1_broadcast_create(p_org uuid, p_kind text, p_title text, p_body text, p_link text default null, p_email boolean default false, p_whatsapp boolean default false,
                                                      p_audience jsonb default '{}'::jsonb, p_ref_table text default null, p_ref uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare bid uuid; n int;
begin
  if not (core.can(p_org, 'org.settings.edit') or core.can(p_org, 'community.listing.moderate')) then raise exception 'not allowed'; end if;
  if coalesce(btrim(p_title), '') = '' or coalesce(btrim(p_body), '') = '' then raise exception 'शीर्षक और संदेश चाहिए'; end if;
  -- one WhatsApp/email broadcast per organisation per 30 minutes (gateway safety); bell-only is unlimited
  if (p_whatsapp or p_email) and exists (select 1 from public.k1_broadcasts b where b.organization_id = p_org and (b.whatsapp or b.email) and b.created_at > now() - interval '30 minutes') then
    raise exception 'पिछला WhatsApp/ईमेल संदेश 30 मिनट के भीतर भेजा गया है — थोड़ी देर बाद भेजें (सिर्फ़ घंटी वाला अभी भेज सकते हैं)';
  end if;
  insert into public.k1_broadcasts (organization_id, kind, ref_table, ref, title, body, link, email, whatsapp, audience, created_by)
  values (p_org, coalesce(p_kind, 'general'), p_ref_table, p_ref, left(btrim(p_title), 200), left(btrim(p_body), 2000), p_link, coalesce(p_email, false), coalesce(p_whatsapp, false), coalesce(p_audience, '{}'::jsonb), auth.uid())
  returning id into bid;
  insert into public.k1_broadcast_queue (broadcast_id, user_id) select bid, a.user_id from public.k1_broadcast_audience(p_org, coalesce(p_audience, '{}'::jsonb)) a on conflict do nothing;
  get diagnostics n = row_count;
  update public.k1_broadcasts set total = n where id = bid;
  if not (p_email or p_whatsapp) then
    -- bell only: deliver at once
    insert into public.cm_notifications (organization_id, user_id, kind, text, link)
    select p_org, q.user_id, case when p_kind in ('announcement', 'event', 'blood') then p_kind else 'system' end, left(btrim(p_title) || ' — ' || btrim(p_body), 400), p_link
      from public.k1_broadcast_queue q where q.broadcast_id = bid;
    update public.k1_broadcast_queue set status = 'sent', sent_at = now() where broadcast_id = bid;
    update public.k1_broadcasts set status = 'done', sent = n, finished_at = now() where id = bid;
  end if;
  return jsonb_build_object('id', bid, 'total', n);
end $$;
grant execute on function public.k1_broadcast_create(uuid, text, text, text, text, boolean, boolean, jsonb, text, uuid) to authenticated;

create or replace function public.k1_broadcasts_list(p_org uuid, p_limit int default 30)
returns table (id uuid, kind text, title text, email boolean, whatsapp boolean, status text, total int, sent int, created_at timestamptz, finished_at timestamptz, created_by_name text)
language sql stable security definer set search_path = '' as $$
  select b.id, b.kind, b.title, b.email, b.whatsapp, b.status, b.total, b.sent, b.created_at, b.finished_at, public.k1_user_name(b.created_by)
    from public.k1_broadcasts b
   where b.organization_id = p_org and (core.can(p_org, 'org.settings.edit') or core.can(p_org, 'community.listing.moderate'))
   order by b.created_at desc limit p_limit;
$$;
grant execute on function public.k1_broadcasts_list(uuid, int) to authenticated;

create or replace function public.k1_broadcast_cancel(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare b public.k1_broadcasts;
begin
  select * into b from public.k1_broadcasts where id = p_id;
  if b.id is null or not (core.can(b.organization_id, 'org.settings.edit') or core.can(b.organization_id, 'community.listing.moderate')) then raise exception 'not allowed'; end if;
  update public.k1_broadcasts set status = 'cancelled', finished_at = now() where id = p_id and status in ('queued', 'sending');
  update public.k1_broadcast_queue set status = 'skipped' where broadcast_id = p_id and status = 'queued';
end $$;
grant execute on function public.k1_broadcast_cancel(uuid) to authenticated;

-- the sender: 25 per minute across all organisations, oldest broadcast first
create or replace function public.k1_broadcast_tick()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in
    select q.broadcast_id, q.user_id, b.organization_id, b.kind, b.title, b.body, b.link, b.email, b.whatsapp
      from public.k1_broadcast_queue q join public.k1_broadcasts b on b.id = q.broadcast_id
     where q.status = 'queued' and b.status in ('queued', 'sending')
     order by b.created_at, q.user_id limit 25
  loop
    begin
      perform public.k1_notify_user2(r.organization_id, r.user_id, r.title, r.body, r.link, 'k1_broadcasts', r.broadcast_id, r.email, r.whatsapp,
                                     case when r.kind in ('announcement', 'event', 'blood') then r.kind else 'system' end);
    exception when others then null; end;
    update public.k1_broadcast_queue set status = 'sent', sent_at = now() where broadcast_id = r.broadcast_id and user_id = r.user_id;
    update public.k1_broadcasts set status = 'sending', sent = sent + 1 where id = r.broadcast_id;
    n := n + 1;
  end loop;
  update public.k1_broadcasts b set status = 'done', finished_at = now()
   where b.status = 'sending' and not exists (select 1 from public.k1_broadcast_queue q where q.broadcast_id = b.id and q.status = 'queued');
  return n;
end $$;
revoke execute on function public.k1_broadcast_tick() from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-broadcast-tick'); exception when others then null; end $$;
select cron.schedule('k1-broadcast-tick', '* * * * *', $$select public.k1_broadcast_tick()$$);

-- ---------- blood: alert compatible donors ----------
create or replace function public.k1_blood_donor_groups(p_recipient text)
returns text[] language sql immutable as $$
  select case upper(replace(p_recipient, ' ', ''))
    when 'O-' then array['O-']
    when 'O+' then array['O+','O-']
    when 'A-' then array['A-','O-']
    when 'A+' then array['A+','A-','O+','O-']
    when 'B-' then array['B-','O-']
    when 'B+' then array['B+','B-','O+','O-']
    when 'AB-' then array['AB-','A-','B-','O-']
    when 'AB+' then array['AB+','AB-','A+','A-','B+','B-','O+','O-']
    else array[upper(replace(p_recipient, ' ', ''))] end;
$$;

create table if not exists public.k1_blood_alert_log (requirement_id uuid not null, donor_id uuid not null, created_at timestamptz not null default now(), primary key (requirement_id, donor_id));
alter table public.k1_blood_alert_log enable row level security;

create or replace function public.k1_blood_alert(p_requirement uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare r public.blood_requirements; d record; n int := 0; msg text; groups text[];
begin
  select * into r from public.blood_requirements where id = p_requirement;
  if r.id is null or r.verification_status not in ('verified', 'active') then return 0; end if;
  groups := public.k1_blood_donor_groups(r.blood_group);
  msg := '🩸 रक्त की आवश्यकता — ' || r.blood_group || coalesce(' (' || r.component || ')', '') || E'\n'
      || coalesce(r.units_required::text || ' यूनिट · ', '') || coalesce(r.hospital, '') || coalesce(', ' || r.city, '') || E'\n'
      || coalesce('ज़रूरत: ' || to_char(r.required_date, 'DD.MM.YYYY') || E'\n', '')
      || coalesce('संपर्क: ' || coalesce(r.requester_name, '') || ' ' || coalesce(r.requester_whatsapp, r.requester_mobile, r.hospital_contact) || E'\n', '')
      || 'आप रक्तदाता के रूप में पंजीकृत हैं और आपका ग्रुप मेल खाता है। मदद कर सकें तो ऊपर के नंबर पर सीधे संपर्क करें। 🙏';
  for d in
    select bd.* from public.blood_donors bd
     where bd.organization_id = r.organization_id and coalesce(bd.status, 'active') in ('active', 'verified')
       and upper(replace(bd.blood_group, ' ', '')) = any(groups)
       and coalesce(bd.consent, true) and (bd.eligible_from is null or bd.eligible_from <= current_date)
       and (bd.last_donation_date is null or bd.last_donation_date <= current_date - 90)
       and not exists (select 1 from public.k1_blood_alert_log l where l.requirement_id = r.id and l.donor_id = bd.id)
     order by (lower(coalesce(bd.district, '')) = lower(coalesce(r.district, '-'))) desc, (lower(coalesce(bd.city, '')) = lower(coalesce(r.city, '-'))) desc,
              coalesce(bd.emergency_available, false) desc, (lower(coalesce(bd.state, '')) = lower(coalesce(r.state, '-'))) desc
     limit 60
  loop
    if d.user_id is not null then
      perform public.k1_notify_user2(r.organization_id, d.user_id, '🩸 ' || r.blood_group || ' रक्त की आवश्यकता', msg, '/blood', 'blood_requirements', r.id, false, true, 'blood');
    elsif coalesce(d.whatsapp, d.mobile, '') <> '' then
      perform public.k1_send(r.organization_id, 'whatsapp', coalesce(d.whatsapp, d.mobile), d.full_name, null, msg, 'blood_requirements', r.id);
    else continue; end if;
    insert into public.k1_blood_alert_log (requirement_id, donor_id) values (r.id, d.id) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.k1_blood_alert(uuid) to authenticated;

create or replace function public.trg_blood_requirement_alert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verification_status in ('verified', 'active') and (tg_op = 'INSERT' or old.verification_status is distinct from new.verification_status) then
    begin perform public.k1_blood_alert(new.id); exception when others then null; end;
  end if;
  return new;
end $$;
do $x$ begin execute 'DR' || 'OP trigger if exists trg_blood_requirement_alert on public.blood_requirements'; end $x$;
create trigger trg_blood_requirement_alert after insert or update of verification_status on public.blood_requirements for each row execute function public.trg_blood_requirement_alert();

-- ---------- events: automatic reminders ----------
create table if not exists public.k1_event_reminder_log (guest_id uuid not null, stage text not null, created_at timestamptz not null default now(), primary key (guest_id, stage));
alter table public.k1_event_reminder_log enable row level security;

create or replace function public.k1_event_reminders(p_stage text)
returns int language plpgsql security definer set search_path = '' as $$
declare g record; n int := 0; today date := (now() at time zone 'Asia/Kolkata')::date; target date; msg text;
begin
  target := case when p_stage = 'eve' then today + 1 else today end;
  for g in
    select gu.*, e.title, e.title_hi, e.starts_at, e.venue, e.venue_hi, e.map_url, e.slug, e.organization_id as org
      from public.ev_guests gu join public.ev_events e on e.id = gu.event_id
     where e.status = 'published' and (e.starts_at at time zone 'Asia/Kolkata')::date = target
       and coalesce(gu.rsvp, 'none') in ('yes', 'none', 'maybe') and coalesce(gu.phone, '') <> ''
       and not exists (select 1 from public.k1_event_reminder_log l where l.guest_id = gu.id and l.stage = p_stage)
     limit 400
  loop
    msg := case when p_stage = 'eve' then '📅 कल का कार्यक्रम — ' else '🌅 आज का कार्यक्रम — ' end || coalesce(g.title_hi, g.title) || E'\n'
        || '🕒 ' || to_char(g.starts_at at time zone 'Asia/Kolkata', 'DD.MM.YYYY, HH12:MI AM') || E'\n'
        || coalesce('📍 ' || coalesce(g.venue_hi, g.venue) || E'\n', '') || coalesce(g.map_url || E'\n', '')
        || 'नमस्ते ' || coalesce(g.name, '') || ' जी, आपकी उपस्थिति की प्रतीक्षा रहेगी। 🙏';
    perform public.k1_send(g.org, 'whatsapp', g.phone, g.name, null, msg, 'ev_guests', g.id);
    insert into public.k1_event_reminder_log (guest_id, stage) values (g.id, p_stage) on conflict do nothing;
    update public.ev_guests set reminded_at = now() where id = g.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_event_reminders(text) from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-event-reminders-eve'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('k1-event-reminders-day'); exception when others then null; end $$;
select cron.schedule('k1-event-reminders-eve', '30 12 * * *', $$select public.k1_event_reminders('eve')$$);   -- 18:00 IST
select cron.schedule('k1-event-reminders-day', '0 2 * * *', $$select public.k1_event_reminders('day')$$);     -- 07:30 IST
