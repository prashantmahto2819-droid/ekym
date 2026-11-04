-- Kalchuri One · Phase 5 · Communication engine: channels (Vivid Relay / Meta Cloud API / SMTP),
-- consents & opt-outs, message templates, campaigns, server-side message queue with retries.
-- Secrets (API keys, tokens, SMTP passwords) live in Supabase Vault; tables only hold the vault secret id.

create table public.comms_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null check (kind in ('whatsapp','email')),
  provider text not null check (provider in ('vivid_relay','meta_cloud','smtp')),
  name text not null,
  config jsonb not null default '{}'::jsonb,   -- relay_url, session | phone_number_id, waba_id | host, port, username, from_email, from_name
  secret_id uuid,                               -- vault.secrets.id (relay key | meta token | smtp password)
  status text not null default 'active' check (status in ('active','paused','error')),
  is_default boolean not null default false,
  daily_limit int not null default 500,
  gap_min_s int not null default 4,
  gap_max_s int not null default 12,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.comms_channels(organization_id, kind);
create trigger trg_comms_channels_updated before update on public.comms_channels for each row execute function public.set_updated_at();
create trigger audit_comms_channels after insert or update or delete on public.comms_channels for each row execute function core.audit_row();

create table public.comms_consents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  contact text not null,                        -- 91XXXXXXXXXX or lower-case email
  user_id uuid references auth.users(id) on delete set null,
  name text,
  purposes text[] not null default array['utility'],   -- utility (receipts, notices), marketing (campaigns)
  source text not null default 'form',          -- form | import | admin | api
  given_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  unique (organization_id, contact)
);
create index on public.comms_consents(organization_id, contact);

create table public.comms_opt_outs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade,  -- null = platform-wide
  contact text not null,
  reason text,
  created_at timestamptz not null default now()
);
create unique index comms_opt_outs_unique on public.comms_opt_outs (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), contact);

create table public.comms_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade,  -- null = shared
  kind text not null check (kind in ('whatsapp','email')),
  name text not null,
  category text not null default 'utility' check (category in ('utility','marketing','authentication')),
  language text not null default 'hi',
  subject text,                                 -- email only
  body text not null,                           -- {{merge.fields}} like the design engine
  meta_template_name text,                      -- Meta Cloud approved template (business-initiated)
  meta_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_comms_templates_updated before update on public.comms_templates for each row execute function public.set_updated_at();

create table public.comms_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null,
  purpose text not null default 'utility' check (purpose in ('utility','marketing')),
  channel_id uuid references public.comms_channels(id) on delete set null,
  template_id uuid references public.comms_templates(id) on delete set null,
  audience jsonb not null default '{}'::jsonb,  -- {source: members|committee|custom, filters…}
  status text not null default 'draft' check (status in ('draft','scheduled','sending','done','cancelled')),
  schedule_at timestamptz,
  total int not null default 0, sent int not null default 0, failed int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_comms_campaigns_updated before update on public.comms_campaigns for each row execute function public.set_updated_at();

create table public.comms_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  campaign_id uuid references public.comms_campaigns(id) on delete set null,
  channel_id uuid references public.comms_channels(id) on delete set null,
  kind text not null check (kind in ('whatsapp','email')),
  purpose text not null default 'utility' check (purpose in ('utility','marketing','authentication')),
  to_contact text not null,
  to_name text,
  subject text,
  body text not null,
  media jsonb not null default '[]'::jsonb,     -- [{type: image|document, bucket, path, filename}] or [{type, url}]
  meta_template jsonb,                          -- {name, language, components} when sending a Meta template
  status text not null default 'queued' check (status in ('queued','sending','sent','delivered','read','failed','cancelled','blocked')),
  attempts int not null default 0,
  max_attempts int not null default 4,
  next_attempt_at timestamptz not null default now(),
  lock_until timestamptz,
  provider_message_id text,
  error text,
  cost numeric(10,4),
  ref_table text, ref_id uuid,                  -- docs_documents / gov_meetings / donations …
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz
);
create index on public.comms_messages(status, next_attempt_at) where status in ('queued','sending');
create index on public.comms_messages(organization_id, created_at desc);
create index on public.comms_messages(provider_message_id);
create index on public.comms_messages(ref_table, ref_id);

-- ---------- RLS ----------
do $$
declare t text;
begin
  foreach t in array array['comms_channels','comms_consents','comms_opt_outs','comms_templates','comms_campaigns','comms_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
create policy channels_read on public.comms_channels for select to authenticated using (core.is_org_team(organization_id));
create policy channels_write on public.comms_channels for all to authenticated
  using (core.can(organization_id, 'comms.channel.manage')) with check (core.can(organization_id, 'comms.channel.manage'));
-- secret_id is never useful to clients but keep it hidden anyway
revoke select on public.comms_channels from authenticated;
grant select (id, organization_id, kind, provider, name, config, status, is_default, daily_limit, gap_min_s, gap_max_s, last_error, created_at, updated_at) on public.comms_channels to authenticated;

create policy consents_rw on public.comms_consents for all to authenticated
  using (core.can(organization_id, 'comms.campaign.send')) with check (core.can(organization_id, 'comms.campaign.send'));
create policy consents_insert_public on public.comms_consents for insert with check (true);  -- join/contact forms (anon) record consent
grant insert on public.comms_consents to anon;

create policy optouts_read on public.comms_opt_outs for select to authenticated using (organization_id is null or core.is_org_team(organization_id));
create policy optouts_write on public.comms_opt_outs for all to authenticated
  using (organization_id is not null and core.can(organization_id, 'comms.campaign.send')) with check (organization_id is not null and core.can(organization_id, 'comms.campaign.send'));

create policy templates_read on public.comms_templates for select to authenticated using (organization_id is null or core.is_org_team(organization_id));
create policy templates_write on public.comms_templates for all to authenticated
  using ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'comms.campaign.send')))
  with check ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'comms.campaign.send')));

create policy campaigns_rw on public.comms_campaigns for all to authenticated
  using (core.can(organization_id, 'comms.campaign.send')) with check (core.can(organization_id, 'comms.campaign.send'));

create policy messages_read on public.comms_messages for select to authenticated
  using (core.can(organization_id, 'comms.campaign.send') or core.can(organization_id, 'docs.letter.dispatch') or created_by = auth.uid());
-- inserts only through k1_enqueue_message; updates only by the worker (service role)

-- ---------- secrets in Vault ----------
create or replace function public.k1_comms_set_secret(p_channel uuid, p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.comms_channels; sid uuid;
begin
  select * into c from public.comms_channels where id = p_channel;
  if c is null or not core.can(c.organization_id, 'comms.channel.manage') then raise exception 'Not allowed'; end if;
  if c.secret_id is null then
    sid := vault.create_secret(p_secret, 'comms_channel_' || c.id::text, 'Kalchuri One channel secret');
    update public.comms_channels set secret_id = sid, status = 'active', last_error = null where id = p_channel;
  else
    perform vault.update_secret(c.secret_id, p_secret);
    update public.comms_channels set status = 'active', last_error = null where id = p_channel;
  end if;
end $$;
revoke all on function public.k1_comms_set_secret(uuid, text) from public;
grant execute on function public.k1_comms_set_secret(uuid, text) to authenticated;

-- worker only (service role): channel config with the decrypted secret
create or replace function public.k1_comms_channel_runtime(p_channel uuid)
returns table (id uuid, organization_id uuid, kind text, provider text, config jsonb, secret text, gap_min_s int, gap_max_s int, daily_limit int, status text)
language sql security definer set search_path = '' as $$
  select c.id, c.organization_id, c.kind, c.provider, c.config, s.decrypted_secret, c.gap_min_s, c.gap_max_s, c.daily_limit, c.status
    from public.comms_channels c left join vault.decrypted_secrets s on s.id = c.secret_id
   where c.id = p_channel;
$$;
revoke all on function public.k1_comms_channel_runtime(uuid) from public, anon, authenticated;
grant execute on function public.k1_comms_channel_runtime(uuid) to service_role;

-- ---------- helpers ----------
create or replace function public.k1_norm_contact(p text)
returns text language sql immutable as $$
  select case when p ~ '@' then lower(trim(p))
              when length(regexp_replace(p, '[^0-9]', '', 'g')) = 10 then '91' || regexp_replace(p, '[^0-9]', '', 'g')
              else regexp_replace(p, '[^0-9]', '', 'g') end;
$$;

create or replace function public.k1_pick_channel(p_org uuid, p_kind text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.comms_channels
   where organization_id = p_org and kind = p_kind and status = 'active'
   order by is_default desc, created_at limit 1;
$$;

-- ---------- enqueue ----------
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
          or (p_ref_table = 'org_memberships' and core.can(p_org, 'org.member.approve'));
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
revoke all on function public.k1_enqueue_message(uuid, text, text, text, text, text, jsonb, text, text, uuid, uuid, uuid, jsonb) from public;
grant execute on function public.k1_enqueue_message(uuid, text, text, text, text, text, jsonb, text, text, uuid, uuid, uuid, jsonb) to authenticated, service_role;

-- cancel a queued message (sender or campaign manager)
create or replace function public.k1_cancel_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.comms_messages;
begin
  select * into m from public.comms_messages where id = p_id;
  if m is null then return; end if;
  if not (m.created_by = auth.uid() or core.can(m.organization_id, 'comms.campaign.send')) then raise exception 'Not allowed'; end if;
  update public.comms_messages set status = 'cancelled' where id = p_id and status = 'queued';
end $$;
grant execute on function public.k1_cancel_message(uuid) to authenticated;

-- ---------- worker claim / result (service role) ----------
create or replace function public.k1_comms_claim(p_batch int default 10)
returns setof public.comms_messages language plpgsql security definer set search_path = '' as $$
begin
  -- release stale locks
  update public.comms_messages set status = 'queued', lock_until = null where status = 'sending' and lock_until < now();
  return query
  with picked as (
    select m.id from public.comms_messages m
      join public.comms_channels c on c.id = m.channel_id and c.status = 'active'
     where m.status = 'queued' and m.next_attempt_at <= now()
       and (select count(*) from public.comms_messages x where x.channel_id = m.channel_id and x.sent_at > now() - interval '24 hours') < c.daily_limit
     order by m.created_at
     limit p_batch
     for update of m skip locked)
  update public.comms_messages m set status = 'sending', lock_until = now() + interval '5 minutes', attempts = m.attempts + 1
   from picked where m.id = picked.id returning m.*;
end $$;

create or replace function public.k1_comms_result(p_id uuid, p_ok boolean, p_provider_id text default null, p_error text default null, p_fatal boolean default false, p_cost numeric default null)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.comms_messages;
begin
  select * into m from public.comms_messages where id = p_id;
  if m is null then return; end if;
  if p_ok then
    update public.comms_messages set status = 'sent', sent_at = now(), provider_message_id = p_provider_id, error = null, lock_until = null, cost = coalesce(p_cost, cost) where id = p_id;
    if m.campaign_id is not null then update public.comms_campaigns set sent = sent + 1 where id = m.campaign_id; end if;
  elsif p_fatal then
    -- channel problem (auth/quota): pause the channel, put the message back
    update public.comms_channels set status = 'error', last_error = p_error where id = m.channel_id;
    update public.comms_messages set status = 'queued', lock_until = null, attempts = greatest(attempts - 1, 0), error = p_error where id = p_id;
  elsif m.attempts >= m.max_attempts then
    update public.comms_messages set status = 'failed', error = p_error, lock_until = null where id = p_id;
    if m.campaign_id is not null then update public.comms_campaigns set failed = failed + 1 where id = m.campaign_id; end if;
  else
    update public.comms_messages set status = 'queued', error = p_error, lock_until = null,
           next_attempt_at = now() + (power(2, m.attempts) * interval '2 minutes') where id = p_id;
  end if;
end $$;

create or replace function public.k1_comms_status_update(p_provider_id text, p_status text, p_at timestamptz default now())
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status = 'delivered' then update public.comms_messages set status = case when status = 'read' then status else 'delivered' end, delivered_at = coalesce(delivered_at, p_at) where provider_message_id = p_provider_id;
  elsif p_status = 'read' then update public.comms_messages set status = 'read', read_at = coalesce(read_at, p_at), delivered_at = coalesce(delivered_at, p_at) where provider_message_id = p_provider_id;
  elsif p_status = 'failed' then update public.comms_messages set status = 'failed', error = coalesce(error, 'Provider reported failure') where provider_message_id = p_provider_id;
  end if;
end $$;

-- STOP / opt-out from an inbound message (worker/webhook)
create or replace function public.k1_comms_opt_out(p_org uuid, p_contact text, p_reason text default 'STOP')
returns void language sql security definer set search_path = '' as $$
  insert into public.comms_opt_outs(organization_id, contact, reason) values (p_org, public.k1_norm_contact(p_contact), p_reason)
  on conflict do nothing;
$$;

revoke all on function public.k1_comms_claim(int), public.k1_comms_result(uuid, boolean, text, text, boolean, numeric), public.k1_comms_status_update(text, text, timestamptz), public.k1_comms_opt_out(uuid, text, text) from public, anon, authenticated;
grant execute on function public.k1_comms_claim(int), public.k1_comms_result(uuid, boolean, text, text, boolean, numeric), public.k1_comms_status_update(text, text, timestamptz), public.k1_comms_opt_out(uuid, text, text) to service_role;

-- ---------- cron tick → edge function comms-worker (same pattern as shokpatra send_letters_tick) ----------
create or replace function public.comms_tick()
returns void language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  if not exists (select 1 from public.comms_messages where status = 'queued' and next_attempt_at <= now()) then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/comms-worker',
    body := jsonb_build_object('action', 'tick'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 10000);
exception when others then null;
end $$;
select cron.schedule('kalchuri-comms-worker', '* * * * *', 'select public.comms_tick()');

-- ---------- message stats for the admin page ----------
create or replace function public.k1_comms_stats(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'queued', count(*) filter (where status in ('queued','sending')),
    'sent_24h', count(*) filter (where sent_at > now() - interval '24 hours'),
    'failed_7d', count(*) filter (where status = 'failed' and created_at > now() - interval '7 days'),
    'blocked_7d', count(*) filter (where status = 'blocked' and created_at > now() - interval '7 days'))
  from public.comms_messages where organization_id = p_org and core.is_org_team(p_org);
$$;
grant execute on function public.k1_comms_stats(uuid) to authenticated;
