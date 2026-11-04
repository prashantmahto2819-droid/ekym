-- Kalchuri One · Phase 12 · advertisements & revenue: ad settings per org (AdSense, ads.txt, consent), sponsor campaigns, daily stats.

create table public.ad_settings (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  enabled boolean not null default false,
  adsense_client text,                                  -- ca-pub-XXXX
  adsense_slots jsonb not null default '{}'::jsonb,     -- {header: '123', sidebar: '456', feed: '789', footer: '...'}
  ads_txt text,                                         -- content served at /ads.txt
  consent_banner boolean not null default true,
  consent_text text, consent_text_hi text,
  slots jsonb not null default '{"header": true, "sidebar": true, "feed": true, "footer": true, "post_bottom": true}'::jsonb,
  excluded_paths text[] not null default array['/shok', '/families', '/lineage', '/matrimony', '/rsvp', '/admin', '/verify', '/donate', '/donation-status'],
  updated_at timestamptz not null default now()
);
create trigger trg_ad_settings_updated before update on public.ad_settings for each row execute function public.set_updated_at();

create table public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  sponsor_name text not null,
  sponsor_phone text, sponsor_email text,
  party_id uuid references public.fin_parties(id) on delete set null,
  title text not null,                                  -- internal name
  creative_image text,                                  -- banner image URL (storage or external)
  creative_text text, creative_text_hi text,            -- text-only ad fallback
  link_url text,
  slots text[] not null default array['sidebar'],       -- where it may appear
  starts_on date not null default current_date,
  ends_on date,
  price numeric(12,2) not null default 0,               -- agreed amount
  voucher_id uuid references public.fin_vouchers(id) on delete set null,   -- receipt voucher when paid
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  weight int not null default 1 check (weight between 1 and 10),
  impressions int not null default 0,
  clicks int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.ad_campaigns(organization_id, status);
create trigger trg_ad_campaigns_updated before update on public.ad_campaigns for each row execute function public.set_updated_at();

create table public.ad_stats (
  organization_id uuid not null references core.organizations(id) on delete cascade,
  campaign_id uuid references public.ad_campaigns(id) on delete cascade,
  slot text not null,
  day date not null default current_date,
  impressions int not null default 0,
  clicks int not null default 0,
  primary key (organization_id, slot, day, campaign_id)
);

-- manual revenue entries (AdSense payouts etc.) for the dashboard; sponsor income comes from fin vouchers
create table public.ad_revenue (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  source text not null check (source in ('adsense','sponsor','other')),
  month date not null,                                  -- first day of month
  amount numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, source, month)
);

alter table public.ad_settings enable row level security;
alter table public.ad_campaigns enable row level security;
alter table public.ad_stats enable row level security;
alter table public.ad_revenue enable row level security;
create policy ad_settings_public_read on public.ad_settings for select using (true);
create policy ad_campaigns_manage on public.ad_campaigns for all to authenticated using (core.can(organization_id, 'ads.manage')) with check (core.can(organization_id, 'ads.manage'));
create policy ad_settings_write on public.ad_settings for all to authenticated using (core.can(organization_id, 'ads.manage')) with check (core.can(organization_id, 'ads.manage'));
create policy ad_campaigns_public_read on public.ad_campaigns for select using (status = 'active' and starts_on <= current_date and (ends_on is null or ends_on >= current_date));
create policy ad_stats_read on public.ad_stats for select to authenticated using (core.can(organization_id, 'ads.manage'));
create policy ad_revenue_rw on public.ad_revenue for all to authenticated using (core.can(organization_id, 'ads.manage') or core.can(organization_id, 'fin.report.view')) with check (core.can(organization_id, 'ads.manage'));
grant select on public.ad_settings, public.ad_campaigns to anon, authenticated;
grant insert, update, delete on public.ad_settings, public.ad_campaigns to authenticated;
grant select on public.ad_stats to authenticated;
grant select, insert, update, delete on public.ad_revenue to authenticated;

-- what to show in a slot: the active sponsor creatives for this slot (client picks by weight), plus adsense config
create or replace function public.k1_ads_for(p_org uuid, p_slot text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'enabled', coalesce(s.enabled, false) and coalesce((s.slots->>p_slot)::boolean, true),
    'excluded_paths', coalesce(s.excluded_paths, '{}'),
    'adsense_client', s.adsense_client,
    'adsense_slot', s.adsense_slots->>p_slot,
    'consent_banner', coalesce(s.consent_banner, true),
    'consent_text', s.consent_text, 'consent_text_hi', s.consent_text_hi,
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'image', c.creative_image, 'text', c.creative_text, 'text_hi', c.creative_text_hi, 'link', c.link_url, 'sponsor', c.sponsor_name, 'weight', c.weight))
                           from public.ad_campaigns c where c.organization_id = p_org and c.status = 'active' and p_slot = any(c.slots) and c.starts_on <= current_date and (c.ends_on is null or c.ends_on >= current_date)), '[]'::jsonb))
    from (select 1) one left join public.ad_settings s on s.organization_id = p_org;
$$;
grant execute on function public.k1_ads_for(uuid, text) to anon, authenticated;

-- impression / click counters (public, batched per day)
create or replace function public.k1_ad_hit(p_org uuid, p_slot text, p_campaign uuid, p_click boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ad_stats(organization_id, campaign_id, slot, day, impressions, clicks)
  values (p_org, p_campaign, p_slot, current_date, case when p_click then 0 else 1 end, case when p_click then 1 else 0 end)
  on conflict (organization_id, slot, day, campaign_id) do update set impressions = public.ad_stats.impressions + excluded.impressions, clicks = public.ad_stats.clicks + excluded.clicks;
  if p_campaign is not null then
    update public.ad_campaigns set impressions = impressions + case when p_click then 0 else 1 end, clicks = clicks + case when p_click then 1 else 0 end where id = p_campaign;
  end if;
end $$;
grant execute on function public.k1_ad_hit(uuid, text, uuid, boolean) to anon, authenticated;

-- revenue dashboard: sponsor income from posted receipt vouchers on account 4400 + manual entries, by month
create or replace function public.k1_ad_revenue(p_org uuid, p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'sponsor_vouchers', coalesce((select sum(l.credit) from public.fin_lines l join public.fin_vouchers v on v.id = l.voucher_id join public.fin_accounts a on a.id = l.account_id
                                   where v.organization_id = p_org and v.status = 'posted' and a.code = '4400' and v.voucher_date between p_from and p_to), 0),
    'manual', coalesce((select jsonb_agg(jsonb_build_object('source', r.source, 'month', r.month, 'amount', r.amount, 'note', r.note) order by r.month) from public.ad_revenue r where r.organization_id = p_org and r.month between date_trunc('month', p_from) and p_to), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'title', c.title, 'sponsor', c.sponsor_name, 'price', c.price, 'paid', c.voucher_id is not null, 'status', c.status, 'impressions', c.impressions, 'clicks', c.clicks, 'starts_on', c.starts_on, 'ends_on', c.ends_on) order by c.starts_on desc) from public.ad_campaigns c where c.organization_id = p_org), '[]'::jsonb),
    'by_slot', coalesce((select jsonb_object_agg(slot, imps) from (select s.slot, sum(s.impressions) imps from public.ad_stats s where s.organization_id = p_org and s.day between p_from and p_to group by s.slot) x), '{}'::jsonb))
  where core.can(p_org, 'ads.manage') or core.can(p_org, 'fin.report.view');
$$;
grant execute on function public.k1_ad_revenue(uuid, date, date) to authenticated;

-- sponsor paid → receipt voucher (4400 Sponsorship / advertisement) + link to the campaign
create or replace function public.k1_ad_campaign_paid(p_campaign uuid, p_mode text default 'upi', p_ref text default null, p_date date default current_date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.ad_campaigns; bank uuid; inc uuid; pid uuid; vid uuid;
begin
  select * into c from public.ad_campaigns where id = p_campaign;
  if c is null or not core.can(c.organization_id, 'ads.manage') then raise exception 'Not allowed'; end if;
  if c.voucher_id is not null then return c.voucher_id; end if;
  if c.price <= 0 then raise exception 'Set the campaign price first'; end if;
  select id into bank from public.fin_accounts where organization_id = c.organization_id and ((p_mode = 'cash' and is_cash) or (p_mode <> 'cash' and is_bank)) and is_active order by sort_order limit 1;
  select id into inc from public.fin_accounts where organization_id = c.organization_id and code = '4400';
  if bank is null or inc is null then raise exception 'Set up the chart of accounts first (Admin → Accounts)'; end if;
  pid := c.party_id;
  if pid is null then insert into public.fin_parties(organization_id, kind, name, phone, email) values (c.organization_id, 'sponsor', c.sponsor_name, c.sponsor_phone, c.sponsor_email) returning id into pid; end if;
  perform public.fin_ensure_series(c.organization_id);
  insert into public.fin_vouchers(organization_id, type, voucher_date, party_id, party_name, mode, instrument, narration, source, source_id, created_by, status, number, fy_id, amount, posted_by, posted_at)
  values (c.organization_id, 'receipt', p_date, pid, c.sponsor_name, p_mode, case when p_ref is null then '{}'::jsonb else jsonb_build_object('no', p_ref) end, 'Sponsorship: ' || c.title, 'ad', c.id, auth.uid(),
          'posted', public.k1_next_number(c.organization_id, 'voucher_receipt'), public.fin_ensure_year(c.organization_id, p_date), c.price, auth.uid(), now())
  returning id into vid;
  insert into public.fin_lines(voucher_id, organization_id, account_id, debit, credit, sort_order) values (vid, c.organization_id, bank, c.price, 0, 0), (vid, c.organization_id, inc, 0, c.price, 1);
  update public.ad_campaigns set voucher_id = vid, party_id = pid where id = c.id;
  return vid;
end $$;
grant execute on function public.k1_ad_campaign_paid(uuid, text, text, date) to authenticated;
