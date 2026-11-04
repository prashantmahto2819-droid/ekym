-- Kalchuri One · Phase 10 · events: events, guests, RSVP links, QR check-in, reminders (via comms engine).
create table public.ev_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null, title_hi text,
  kind text not null default 'program' check (kind in ('program','meeting','festival','camp','wedding','shok','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text, venue_hi text, map_url text,
  description text, description_hi text,
  cover_image text,
  organizer text, contact_phone text,
  registration_open boolean not null default false,   -- public can register themselves on the event page
  capacity int,
  status text not null default 'draft' check (status in ('draft','published','cancelled','done')),
  invitation_template_id uuid references public.docs_templates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index on public.ev_events(organization_id, starts_at desc);
create trigger trg_ev_events_updated before update on public.ev_events for each row execute function public.set_updated_at();
create trigger audit_ev_events after insert or update or delete on public.ev_events for each row execute function core.audit_row();

create table public.ev_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.ev_events(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null,
  phone text, email text,
  group_name text,                                  -- family / village / committee …
  seats int not null default 1 check (seats between 1 and 50),
  source text not null default 'manual' check (source in ('manual','members','import','self')),
  membership_id uuid references public.org_memberships(id) on delete set null,
  token text not null default encode(gen_random_bytes(8), 'hex'),   -- RSVP link + QR code
  rsvp text not null default 'none' check (rsvp in ('none','yes','no','maybe')),
  rsvp_at timestamptz, rsvp_note text,
  invited_at timestamptz, reminded_at timestamptz,
  checkin_at timestamptz, checkin_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (event_id, token)
);
create index on public.ev_guests(event_id, rsvp);
create unique index ev_guests_phone_uq on public.ev_guests(event_id, phone) where phone is not null;

alter table public.ev_events enable row level security;
alter table public.ev_guests enable row level security;
create policy ev_events_public_read on public.ev_events for select using (status in ('published','done'));
create policy ev_events_manage on public.ev_events for all to authenticated using (core.can(organization_id, 'events.manage')) with check (core.can(organization_id, 'events.manage'));
create policy ev_guests_manage on public.ev_guests for all to authenticated using (core.can(organization_id, 'events.manage')) with check (core.can(organization_id, 'events.manage'));
grant select on public.ev_events to anon, authenticated;
grant insert, update, delete on public.ev_events to authenticated;
grant select, insert, update, delete on public.ev_guests to authenticated;

-- ---------- public: RSVP by token (no login) ----------
create or replace function public.k1_rsvp_info(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('guest', jsonb_build_object('name', g.name, 'seats', g.seats, 'rsvp', g.rsvp, 'rsvp_note', g.rsvp_note, 'checked_in', g.checkin_at is not null),
                            'event', jsonb_build_object('title', e.title, 'title_hi', e.title_hi, 'starts_at', e.starts_at, 'ends_at', e.ends_at, 'venue', e.venue, 'venue_hi', e.venue_hi, 'map_url', e.map_url, 'cover_image', e.cover_image, 'status', e.status, 'slug', e.slug),
                            'org', jsonb_build_object('name', o.name, 'name_hi', o.name_hi))
    from public.ev_guests g join public.ev_events e on e.id = g.event_id join core.organizations o on o.id = e.organization_id
   where g.token = p_token;
$$;
grant execute on function public.k1_rsvp_info(text) to anon, authenticated;

create or replace function public.k1_rsvp(p_token text, p_answer text, p_seats int default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_answer not in ('yes','no','maybe') then raise exception 'Invalid answer'; end if;
  update public.ev_guests set rsvp = p_answer, rsvp_at = now(), seats = coalesce(least(greatest(p_seats, 1), 50), seats), rsvp_note = left(p_note, 500)
   where token = p_token and exists (select 1 from public.ev_events e where e.id = event_id and e.status = 'published');
  if not found then raise exception 'This invitation is no longer valid'; end if;
end $$;
grant execute on function public.k1_rsvp(text, text, int, text) to anon, authenticated;

-- public self-registration on an open event (creates a guest with source 'self')
create or replace function public.k1_event_register(p_event uuid, p_name text, p_phone text, p_seats int default 1)
returns text language plpgsql security definer set search_path = '' as $$
declare e public.ev_events; tok text; n int;
begin
  select * into e from public.ev_events where id = p_event and status = 'published' and registration_open;
  if e is null then raise exception 'Registration is closed'; end if;
  if e.capacity is not null then
    select coalesce(sum(seats),0) into n from public.ev_guests where event_id = p_event and rsvp = 'yes';
    if n + coalesce(p_seats,1) > e.capacity then raise exception 'Sorry, the event is full'; end if;
  end if;
  insert into public.ev_guests(event_id, organization_id, name, phone, seats, source, rsvp, rsvp_at)
  values (p_event, e.organization_id, left(trim(p_name), 120), public.k1_norm_contact(p_phone), least(greatest(coalesce(p_seats,1),1),50), 'self', 'yes', now())
  on conflict (event_id, phone) where phone is not null do update set rsvp = 'yes', rsvp_at = now(), seats = excluded.seats, name = excluded.name
  returning token into tok;
  return tok;
end $$;
grant execute on function public.k1_event_register(uuid, text, text, int) to anon, authenticated;

-- ---------- staff: check-in, import members, stats ----------
create or replace function public.k1_event_checkin(p_token text, p_undo boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare g public.ev_guests;
begin
  select * into g from public.ev_guests where token = p_token;
  if g is null then return jsonb_build_object('ok', false, 'error', 'Unknown code'); end if;
  if not core.can(g.organization_id, 'events.manage') then raise exception 'Not allowed'; end if;
  if p_undo then update public.ev_guests set checkin_at = null, checkin_by = null where id = g.id; return jsonb_build_object('ok', true, 'name', g.name, 'undone', true); end if;
  if g.checkin_at is not null then return jsonb_build_object('ok', false, 'error', 'Already checked in', 'name', g.name, 'at', g.checkin_at); end if;
  update public.ev_guests set checkin_at = now(), checkin_by = auth.uid() where id = g.id;
  return jsonb_build_object('ok', true, 'name', g.name, 'seats', g.seats, 'rsvp', g.rsvp);
end $$;
grant execute on function public.k1_event_checkin(text, boolean) to authenticated;

create or replace function public.k1_event_import_members(p_event uuid, p_filter text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare e public.ev_events; n int;
begin
  select * into e from public.ev_events where id = p_event;
  if e is null or not core.can(e.organization_id, 'events.manage') then raise exception 'Not allowed'; end if;
  insert into public.ev_guests(event_id, organization_id, name, phone, email, group_name, source, membership_id)
  select p_event, e.organization_id, m.full_name, public.k1_norm_contact(coalesce(m.whatsapp, m.mobile)), m.email, coalesce(m.village, m.city), 'members', m.id
    from public.org_memberships m
   where m.organization_id = e.organization_id and m.status = 'active'
     and (p_filter is null or m.village ilike '%' || p_filter || '%' or m.city ilike '%' || p_filter || '%' or m.category = p_filter)
  on conflict (event_id, phone) where phone is not null do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.k1_event_import_members(uuid, text) to authenticated;

create or replace function public.k1_event_stats(p_event uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'guests', count(*), 'seats', coalesce(sum(seats),0),
    'yes', count(*) filter (where rsvp = 'yes'), 'yes_seats', coalesce(sum(seats) filter (where rsvp = 'yes'),0),
    'no', count(*) filter (where rsvp = 'no'), 'maybe', count(*) filter (where rsvp = 'maybe'), 'none', count(*) filter (where rsvp = 'none'),
    'invited', count(*) filter (where invited_at is not null), 'checked_in', count(*) filter (where checkin_at is not null),
    'checked_in_seats', coalesce(sum(seats) filter (where checkin_at is not null),0))
    from public.ev_guests g where g.event_id = p_event and core.can(g.organization_id, 'events.manage');
$$;
grant execute on function public.k1_event_stats(uuid) to authenticated;

-- k1_enqueue_message may be used for invitations/reminders by event managers
create or replace function public.k1_enqueue_message(
  p_org uuid, p_kind text, p_to text, p_body text,
  p_name text default null, p_subject text default null, p_media jsonb default '[]'::jsonb,
  p_purpose text default 'utility', p_ref_table text default null, p_ref_id uuid default null,
  p_channel uuid default null, p_campaign uuid default null, p_meta_template jsonb default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare contact text; ch uuid; mid uuid; allowed boolean;
begin
  allowed := core.can(p_org, 'comms.campaign.send')
          or (p_ref_table = 'docs_documents' and core.can(p_org, 'docs.letter.dispatch'))
          or (p_ref_table = 'gov_meetings' and core.can(p_org, 'gov.meeting.manage'))
          or (p_ref_table = 'org_memberships' and core.can(p_org, 'org.member.approve'))
          or (p_ref_table = 'ev_events' and core.can(p_org, 'events.manage'));
  if not allowed then raise exception 'Not allowed to send messages for this organization'; end if;
  contact := public.k1_norm_contact(p_to);
  if contact = '' then raise exception 'Recipient contact is empty'; end if;
  if p_kind = 'email' and contact !~ '@' then raise exception 'Not an email address: %', p_to; end if;
  if p_kind = 'whatsapp' and contact !~ '^[0-9]{11,13}$' then raise exception 'Not a WhatsApp number: %', p_to; end if;
  ch := coalesce(p_channel, public.k1_pick_channel(p_org, p_kind));
  if ch is null then raise exception 'No active % channel for this organization. Add one under Admin → Messaging.', p_kind; end if;
  -- consent rules: marketing needs consent; any opt-out blocks
  if exists (select 1 from public.comms_opt_outs o where o.contact = contact and (o.organization_id is null or o.organization_id = p_org)) then
    insert into public.comms_messages(organization_id, campaign_id, channel_id, kind, purpose, to_contact, to_name, subject, body, media, status, error, ref_table, ref_id, created_by)
    values (p_org, p_campaign, ch, p_kind, p_purpose, contact, p_name, p_subject, p_body, coalesce(p_media, '[]'::jsonb), 'blocked', 'Recipient opted out', p_ref_table, p_ref_id, auth.uid()) returning id into mid;
    return mid;
  end if;
  if p_purpose = 'marketing' and not exists (
      select 1 from public.comms_consents c where c.organization_id = p_org and c.contact = contact and c.withdrawn_at is null and 'marketing' = any(c.purposes)) then
    insert into public.comms_messages(organization_id, campaign_id, channel_id, kind, purpose, to_contact, to_name, subject, body, media, status, error, ref_table, ref_id, created_by)
    values (p_org, p_campaign, ch, p_kind, p_purpose, contact, p_name, p_subject, p_body, coalesce(p_media, '[]'::jsonb), 'blocked', 'No marketing consent on record', p_ref_table, p_ref_id, auth.uid()) returning id into mid;
    return mid;
  end if;
  insert into public.comms_messages(organization_id, campaign_id, channel_id, kind, purpose, to_contact, to_name, subject, body, media, meta_template, ref_table, ref_id, created_by)
  values (p_org, p_campaign, ch, p_kind, p_purpose, contact, p_name, p_subject, p_body, coalesce(p_media, '[]'::jsonb), p_meta_template, p_ref_table, p_ref_id, auth.uid())
  returning id into mid;
  return mid;
end $$;
