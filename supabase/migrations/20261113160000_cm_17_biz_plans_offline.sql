-- Kalchuri One business community, phase 3: paid plans paid OFFLINE (QR / UPI / bank / cash) and approved by an admin.
-- (Online gateway + GST invoices through Vivid Brandify come later; billing details are stored now for that.)
--   biz_plans            editable plan table (price, daily posts, sponsored posts per month, reach, days)
--   biz_pay_settings     where to pay: payee, UPI ID, QR image, bank details, note
--   biz_subscriptions    a member's plan request: plan, period, amount, UTR / proof, billing details; admin approves (first wins)
--   biz_boosts           a business post sponsored into everyone's "For you" feed for N days up to a reach cap
--   biz_boost_views, biz_sponsor_hides   frequency caps and "don't show me this business"
--   biz_daily_limit now reads biz_plans; biz_tick() (daily cron) sends renewal reminders.

create table if not exists public.biz_plans (
  key text primary key check (key in ('silver', 'gold')),
  name text not null, name_hi text not null,
  price_month numeric(10,2) not null, price_year numeric(10,2) not null,
  daily_posts int not null default 10,
  sponsored_per_month int not null default 0,
  sponsored_reach int not null default 1000,
  sponsored_days int not null default 3,
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.biz_plans(key, name, name_hi, price_month, price_year, daily_posts, sponsored_per_month, sponsored_reach, sponsored_days, sort) values
  ('silver', 'Silver', 'सिल्वर', 499, 4999, 10, 8, 1000, 3, 1),
  ('gold', 'Gold', 'गोल्ड', 1499, 14999, 10, 30, 3000, 3, 2)
on conflict (key) do nothing;
alter table public.biz_plans enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'biz_plans' and policyname = 'biz_plans_read') then
    create policy biz_plans_read on public.biz_plans for select to anon, authenticated using (true);
  end if;
end $$;

create table if not exists public.biz_pay_settings (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  payee_name text, upi_id text, qr_url text, bank_text text, note text,
  updated_at timestamptz not null default now()
);
alter table public.biz_pay_settings enable row level security;

create table if not exists public.biz_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('silver', 'gold')),
  period text not null check (period in ('month', 'year')),
  amount numeric(10,2) not null,
  pay_mode text not null check (pay_mode in ('upi', 'bank', 'cash', 'grant')),
  pay_ref text, pay_proof_url text, paid_on date,
  buyer_name text, buyer_gstin text, buyer_address text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text, decided_by uuid references auth.users(id), decided_at timestamptz,
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists biz_subs_page_idx on public.biz_subscriptions(page_id, created_at desc);
create index if not exists biz_subs_status_idx on public.biz_subscriptions(organization_id, status);
create unique index if not exists biz_subs_one_pending on public.biz_subscriptions(page_id) where status = 'pending';
alter table public.biz_subscriptions enable row level security;

create table if not exists public.biz_boosts (
  post_id uuid primary key references public.cm_posts(id) on delete cascade,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  reach_cap int not null,
  delivered int not null default 0,
  hidden int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists biz_boosts_active_idx on public.biz_boosts(ends_at);
alter table public.biz_boosts enable row level security;

create table if not exists public.biz_boost_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.cm_posts(id) on delete cascade,
  page_id uuid not null,
  n int not null default 1,
  last_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.biz_boost_views enable row level security;

create table if not exists public.biz_sponsor_hides (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  until timestamptz not null,
  primary key (user_id, page_id)
);
alter table public.biz_sponsor_hides enable row level security;

-- plan-driven limits ---------------------------------------------------------------------------------------------------
create or replace function public.biz_daily_limit(p_tier text) returns int
language sql stable security definer set search_path to '' as $$
  select coalesce((select daily_posts from public.biz_plans where key = p_tier and p_tier in ('silver', 'gold')), 1);
$$;
create or replace function public.biz_month_start() returns timestamptz
language sql stable set search_path to '' as $$ select (date_trunc('month', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'; $$;

create or replace function public.biz_plans_list() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.sort), '[]'::jsonb) from public.biz_plans p;
$$;

create or replace function public.biz_plan_save(p_org uuid, p_key text, p jsonb) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.biz_can_moderate(p_org) then raise exception 'Not allowed'; end if;
  update public.biz_plans set
    price_month = coalesce((p->>'price_month')::numeric, price_month),
    price_year = coalesce((p->>'price_year')::numeric, price_year),
    daily_posts = greatest(1, coalesce((p->>'daily_posts')::int, daily_posts)),
    sponsored_per_month = greatest(0, coalesce((p->>'sponsored_per_month')::int, sponsored_per_month)),
    sponsored_reach = greatest(50, coalesce((p->>'sponsored_reach')::int, sponsored_reach)),
    sponsored_days = least(30, greatest(1, coalesce((p->>'sponsored_days')::int, sponsored_days))),
    active = coalesce((p->>'active')::boolean, active),
    updated_at = now()
  where key = p_key;
end $$;

create or replace function public.biz_pay_settings_get(p_org uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce((select to_jsonb(s) - 'organization_id' from public.biz_pay_settings s where s.organization_id = coalesce(public.k1_root_org(p_org), p_org)), '{}'::jsonb);
$$;

create or replace function public.biz_pay_settings_save(p_org uuid, p jsonb) returns void
language plpgsql security definer set search_path to '' as $$
declare root uuid := coalesce(public.k1_root_org(p_org), p_org);
begin
  if not public.biz_can_moderate(root) then raise exception 'Not allowed'; end if;
  insert into public.biz_pay_settings(organization_id, payee_name, upi_id, qr_url, bank_text, note)
  values (root, nullif(trim(p->>'payee_name'), ''), nullif(trim(p->>'upi_id'), ''), nullif(p->>'qr_url', ''), nullif(trim(p->>'bank_text'), ''), nullif(trim(p->>'note'), ''))
  on conflict (organization_id) do update set payee_name = excluded.payee_name, upi_id = excluded.upi_id, qr_url = excluded.qr_url,
    bank_text = excluded.bank_text, note = excluded.note, updated_at = now();
end $$;

-- requesting a plan ------------------------------------------------------------------------------------------------------
create or replace function public.biz_subscribe(p_page uuid, p_plan text, p_period text, p_pay_mode text, p_ref text default null, p_proof text default null,
  p_paid_on date default null, p_buyer jsonb default '{}'::jsonb) returns uuid
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; pl public.biz_plans; amt numeric; sid uuid;
begin
  select * into b from public.biz_pages where id = p_page;
  if b.id is null or b.owner_id <> auth.uid() then raise exception 'Only the page owner can request a plan'; end if;
  if b.status <> 'active' then raise exception 'यह पेज एडमिन ने रोका है'; end if;
  select * into pl from public.biz_plans where key = p_plan and active;
  if pl.key is null then raise exception 'Plan not available'; end if;
  if p_period not in ('month', 'year') then raise exception 'Choose month or year'; end if;
  if p_pay_mode not in ('upi', 'bank', 'cash') then raise exception 'Choose how you paid'; end if;
  if p_pay_mode in ('upi', 'bank') and length(trim(coalesce(p_ref, ''))) < 6 then raise exception 'भुगतान का UTR / ट्रांज़ैक्शन नंबर लिखें'; end if;
  if exists (select 1 from public.biz_subscriptions where page_id = b.id and status = 'pending') then raise exception 'इस पेज का एक अनुरोध पहले से मंज़ूरी के लिए बाकी है'; end if;
  amt := case when p_period = 'year' then pl.price_year else pl.price_month end;
  insert into public.biz_subscriptions(organization_id, page_id, user_id, plan, period, amount, pay_mode, pay_ref, pay_proof_url, paid_on, buyer_name, buyer_gstin, buyer_address)
  values (b.organization_id, b.id, auth.uid(), pl.key, p_period, amt, p_pay_mode, nullif(trim(coalesce(p_ref, '')), ''), nullif(p_proof, ''), coalesce(p_paid_on, (now() at time zone 'Asia/Kolkata')::date),
          nullif(trim(p_buyer->>'name'), ''), upper(nullif(trim(p_buyer->>'gstin'), '')), nullif(trim(p_buyer->>'address'), ''))
  returning id into sid;
  begin
    perform public.k1_notify_org_admins(b.organization_id, 'community.listing.moderate',
      '💼 व्यापार पैकेज अनुरोध: ' || b.name || ' — ' || pl.name_hi || ' (' || case when p_period = 'year' then 'साल' else 'महीना' end || ') ₹' || amt
      || ' · ' || p_pay_mode || coalesce(' · UTR ' || nullif(trim(coalesce(p_ref, '')), ''), '') || E'\nजाँच कर मंज़ूरी दें: https://kalchuri.org/admin/community', 'biz_subscriptions', sid);
  exception when others then null; end;
  return sid;
end $$;

create or replace function public.biz_cancel_request(p_id uuid) returns void
language sql security definer set search_path to '' as $$
  update public.biz_subscriptions set status = 'cancelled' where id = p_id and user_id = auth.uid() and status = 'pending';
$$;

create or replace function public.biz_page_subscriptions(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(to_jsonb(s) - 'decided_by' order by s.created_at desc), '[]'::jsonb)
    from public.biz_subscriptions s join public.biz_pages b on b.id = s.page_id
   where s.page_id = p_page and (b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id));
$$;

-- admin ------------------------------------------------------------------------------------------------------------------
create or replace function public.biz_subscriptions_admin(p_org uuid, p_status text default 'pending') returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when not public.biz_can_moderate(p_org) then '[]'::jsonb else coalesce(jsonb_agg(
    to_jsonb(s) || jsonb_build_object('page_name', b.name, 'page_slug', b.slug, 'page_tier', public.biz_tier(b), 'page_tier_until', b.tier_until,
      'owner_name', public.k1_user_name(s.user_id), 'owner_phone', b.phone, 'decided_by_name', case when s.decided_by is not null then public.k1_user_name(s.decided_by) end)
    order by s.created_at desc), '[]'::jsonb) end
    from public.biz_subscriptions s join public.biz_pages b on b.id = s.page_id
   where s.organization_id = coalesce(public.k1_root_org(p_org), p_org) and (p_status is null or s.status = p_status);
$$;

create or replace function public.biz_apply_plan(p_sub uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare s public.biz_subscriptions; b public.biz_pages; st timestamptz; en timestamptz;
begin
  select * into s from public.biz_subscriptions where id = p_sub;
  select * into b from public.biz_pages where id = s.page_id for update;
  -- renewing the same plan extends it; a different plan starts now
  st := case when public.biz_tier(b) = s.plan and b.tier_until > now() then b.tier_until else now() end;
  en := st + case when s.period = 'year' then interval '1 year' else interval '1 month' end;
  update public.biz_subscriptions set starts_at = st, ends_at = en where id = s.id;
  update public.biz_pages set tier = s.plan, tier_until = en, verified = true where id = b.id;
end $$;

create or replace function public.biz_decide_subscription(p_id uuid, p_approve boolean, p_note text default null) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare s public.biz_subscriptions; b public.biz_pages; who text; msg text;
begin
  select * into s from public.biz_subscriptions where id = p_id;
  if s.id is null or not public.biz_can_moderate(s.organization_id) then raise exception 'Not allowed'; end if;
  if s.status <> 'pending' then
    raise exception 'पहले ही % द्वारा % किया जा चुका', coalesce(public.k1_user_name(s.decided_by), '—'), case s.status when 'approved' then 'मंज़ूर' when 'rejected' then 'अस्वीकार' else 'रद्द' end;
  end if;
  update public.biz_subscriptions set status = case when p_approve then 'approved' else 'rejected' end,
    admin_note = nullif(trim(coalesce(p_note, '')), ''), decided_by = auth.uid(), decided_at = now() where id = s.id and status = 'pending';
  if p_approve then perform public.biz_apply_plan(s.id); end if;
  select * into b from public.biz_pages where id = s.page_id;
  select * into s from public.biz_subscriptions where id = p_id;
  msg := case when p_approve
    then '✅ आपका ' || case s.plan when 'gold' then 'गोल्ड' else 'सिल्वर' end || ' पैकेज चालू हो गया — ' || b.name || '। वैध: ' || to_char(s.ends_at at time zone 'Asia/Kolkata', 'DD-MM-YYYY') || ' तक।'
    else '❌ आपका पैकेज अनुरोध अस्वीकार हुआ — ' || b.name || coalesce('। कारण: ' || s.admin_note, '') || '। भुगतान हुआ हो तो एडमिन से संपर्क करें।' end;
  begin
    perform public.k1_cm_notify(s.user_id, s.organization_id, 'system', auth.uid(), null, null, msg);
    perform public.k1_notify_user2(s.organization_id, s.user_id, 'व्यापार पैकेज', msg, 'https://kalchuri.org/business/' || b.slug, 'biz_subscriptions', s.id, false, true, 'system');
  exception when others then null; end;
  who := public.k1_user_name(auth.uid());
  return jsonb_build_object('status', s.status, 'ends_at', s.ends_at, 'by', who);
end $$;

create or replace function public.biz_grant_plan(p_page uuid, p_plan text, p_months int, p_note text default null) returns void
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; sid uuid; i int;
begin
  select * into b from public.biz_pages where id = p_page;
  if b.id is null or not public.biz_can_moderate(b.organization_id) then raise exception 'Not allowed'; end if;
  if p_plan not in ('silver', 'gold') or coalesce(p_months, 0) < 1 or p_months > 24 then raise exception 'Choose a plan and 1–24 months'; end if;
  for i in 1..p_months loop
    insert into public.biz_subscriptions(organization_id, page_id, user_id, plan, period, amount, pay_mode, status, admin_note, decided_by, decided_at)
    values (b.organization_id, b.id, b.owner_id, p_plan, 'month', 0, 'grant', 'approved', coalesce(nullif(trim(p_note), ''), 'Admin grant'), auth.uid(), now())
    returning id into sid;
    perform public.biz_apply_plan(sid);
  end loop;
end $$;

-- sponsoring a post ------------------------------------------------------------------------------------------------------
create or replace function public.biz_sponsor_status(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('tier', public.biz_tier(b),
    'limit', coalesce((select sponsored_per_month from public.biz_plans where key = public.biz_tier(b)), 0),
    'used', (select count(*) from public.biz_boosts x where x.page_id = b.id and x.created_at >= public.biz_month_start()),
    'reach', (select sponsored_reach from public.biz_plans where key = public.biz_tier(b)),
    'days', (select sponsored_days from public.biz_plans where key = public.biz_tier(b)),
    'active', coalesce((select jsonb_agg(jsonb_build_object('post_id', x.post_id, 'ends_at', x.ends_at, 'delivered', x.delivered, 'reach_cap', x.reach_cap)) from public.biz_boosts x where x.page_id = b.id and x.ends_at > now()), '[]'::jsonb))
  from public.biz_pages b where b.id = p_page and (b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id));
$$;

create or replace function public.biz_sponsor_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare p public.cm_posts; b public.biz_pages; pl public.biz_plans; used int;
begin
  select * into p from public.cm_posts where id = p_post;
  if p.id is null or p.business_id is null then raise exception 'सिर्फ़ व्यापार पेज की पोस्ट प्रायोजित हो सकती है'; end if;
  select * into b from public.biz_pages where id = p.business_id for update;
  if b.owner_id <> auth.uid() then raise exception 'Only the page owner can sponsor'; end if;
  if b.status <> 'active' or p.status <> 'active' or p.reach <> 'normal' then raise exception 'यह पोस्ट अभी प्रायोजित नहीं हो सकती'; end if;
  select * into pl from public.biz_plans where key = public.biz_tier(b);
  if pl.key is null then raise exception 'प्रायोजित पोस्ट के लिए सिल्वर या गोल्ड पैकेज लें'; end if;
  if exists (select 1 from public.biz_boosts where post_id = p.id) then raise exception 'यह पोस्ट पहले से प्रायोजित है'; end if;
  select count(*) into used from public.biz_boosts where page_id = b.id and created_at >= public.biz_month_start();
  if used >= pl.sponsored_per_month then raise exception 'इस महीने की % प्रायोजित पोस्ट हो चुकीं — अगले महीने फिर', pl.sponsored_per_month; end if;
  insert into public.biz_boosts(post_id, page_id, ends_at, reach_cap) values (p.id, b.id, now() + make_interval(days => pl.sponsored_days), pl.sponsored_reach);
  return jsonb_build_object('used', used + 1, 'limit', pl.sponsored_per_month);
end $$;

create or replace function public.biz_hide_sponsored(p_page uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  insert into public.biz_sponsor_hides(user_id, page_id, until) values (auth.uid(), p_page, now() + interval '30 days')
  on conflict (user_id, page_id) do update set until = excluded.until;
  update public.biz_boosts set hidden = hidden + 1 where page_id = p_page and ends_at > now();
end $$;

-- sponsored posts for my "For you" feed (client mixes them in, at most 1 in 6) ----------------------------------------------
create or replace function public.biz_sponsored_for_me(p_org uuid, p_limit int default 4)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb, business jsonb)
language sql stable security definer set search_path to '' as $function$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  me as (select lower(nullif(trim(u.district), '')) d from public.cm_user_profiles u where u.user_id = auth.uid()),
  c as (
    select x.*, p.author_id, b.id bid, b.district bdist, b.city bcity, public.biz_tier(b) tier
      from public.biz_boosts x
      join public.cm_posts p on p.id = x.post_id
      join public.biz_pages b on b.id = x.page_id
     where b.organization_id = (select id from r) and b.status = 'active' and p.status = 'active' and p.reach = 'normal'
       and x.ends_at > now() and x.delivered < x.reach_cap
       and public.biz_tier(b) in ('silver', 'gold')
       and (auth.uid() is null or b.owner_id <> auth.uid())
       and not exists (select 1 from public.biz_sponsor_hides h where h.user_id = auth.uid() and h.page_id = b.id and h.until > now())
       and not exists (select 1 from public.biz_boost_views v where v.user_id = auth.uid() and v.post_id = x.post_id and v.n >= 2)
       and not exists (select 1 from public.biz_boost_views v where v.user_id = auth.uid() and v.page_id = b.id and v.last_at > now() - interval '20 hours')
  ),
  pick as (
    select distinct on (c.bid) c.* from c
     order by c.bid,
              (case when (select d from me) is not null and lower(coalesce(c.bdist, c.bcity, '')) = (select d from me) then 0 else 1 end),
              c.delivered::numeric / c.reach_cap
  )
  select p.id, p.author_id, public.k1_user_name(p.author_id), public.k1_user_photo(p.author_id),
         p.body, p.media, p.link_url, p.link_kind, p.visibility, false, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         false, false, p.reach, p.moderation_status, null::uuid, null::text, p.tags, false, null::jsonb,
         case when exists (select 1 from public.biz_follows f where f.user_id = auth.uid() and f.page_id = p.business_id) then 'following' else 'none' end,
         jsonb_build_object('kind', 'sponsored'),
         public.biz_card(p.business_id)
    from pick k join public.cm_posts p on p.id = k.post_id
   order by (case when (select d from me) is not null and lower(coalesce(k.bdist, k.bcity, '')) = (select d from me) then 0 else 1 end),
            (k.delivered::numeric / k.reach_cap) / case k.tier when 'gold' then 2 else 1 end
   limit least(coalesce(p_limit, 4), 10);
$function$;

-- seen-tracking also counts sponsored deliveries
create or replace function public.k1_posts_seen(p_ids uuid[]) returns void
language plpgsql security definer set search_path to '' as $$
declare x uuid; bpage uuid;
begin
  if auth.uid() is null then return; end if;
  insert into public.cm_post_seen(user_id, post_id)
  select auth.uid(), y from unnest(p_ids[1:50]) y where exists (select 1 from public.cm_posts p where p.id = y)
  on conflict do nothing;
  for x, bpage in select bb.post_id, bb.page_id from public.biz_boosts bb where bb.post_id = any(p_ids[1:50]) and bb.ends_at > now() loop
    insert into public.biz_boost_views(user_id, post_id, page_id) values (auth.uid(), x, bpage)
    on conflict (user_id, post_id) do update set n = public.biz_boost_views.n + 1, last_at = now()
      where public.biz_boost_views.last_at < now() - interval '20 hours';
    if found then update public.biz_boosts set delivered = delivered + 1 where post_id = x; end if;
  end loop;
end $$;

-- page json gains plan / request info for the owner ------------------------------------------------------------------------
create or replace function public.biz_page_json(b public.biz_pages) returns jsonb
language sql stable security definer set search_path to '' as $$
  select to_jsonb(b) - 'admin_note' - 'tier' - 'tier_until'
    || jsonb_build_object(
      'tier', public.biz_tier(b),
      'tier_until', case when public.biz_tier(b) <> 'free' then b.tier_until end,
      'owner_name', public.k1_user_name(b.owner_id),
      'followers', (select count(*) from public.biz_follows f where f.page_id = b.id),
      'posts', (select count(*) from public.cm_posts p where p.business_id = b.id and p.status = 'active'),
      'i_follow', exists (select 1 from public.biz_follows f where f.page_id = b.id and f.user_id = auth.uid()),
      'mine', b.owner_id = auth.uid(),
      'can_moderate', public.biz_can_moderate(b.organization_id),
      'admin_note', case when b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id) then b.admin_note end,
      'today_posts', case when b.owner_id = auth.uid() then (select count(*) from public.biz_post_log l where l.page_id = b.id and l.created_at >= public.biz_day_start()) end,
      'daily_limit', public.biz_daily_limit(public.biz_tier(b)),
      'pending_request', case when b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id) then
        (select jsonb_build_object('id', s.id, 'plan', s.plan, 'period', s.period, 'amount', s.amount, 'created_at', s.created_at) from public.biz_subscriptions s where s.page_id = b.id and s.status = 'pending' limit 1) end,
      'sponsored_live', (select count(*) from public.biz_boosts x where x.page_id = b.id and x.ends_at > now()));
$$;

-- daily: renewal reminders 7 days and 1 day before the end ------------------------------------------------------------------
create or replace function public.biz_tick() returns int
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; n int := 0; d int; msg text;
begin
  for b in select * from public.biz_pages where tier in ('silver', 'gold') and status = 'active' and tier_until is not null
             and ((tier_until at time zone 'Asia/Kolkata')::date - (now() at time zone 'Asia/Kolkata')::date) in (7, 1) loop
    d := (b.tier_until at time zone 'Asia/Kolkata')::date - (now() at time zone 'Asia/Kolkata')::date;
    msg := '⏳ ' || b.name || ' का ' || case b.tier when 'gold' then 'गोल्ड' else 'सिल्वर' end || ' पैकेज ' || d || ' दिन में ख़त्म होगा। समय पर नवीनीकरण करें ताकि रोज़ 10 पोस्ट और प्रायोजित पोस्ट चलती रहें: https://kalchuri.org/business/' || b.slug;
    begin
      perform public.k1_cm_notify(b.owner_id, b.organization_id, 'renewal', null, null, null, msg);
      perform public.k1_notify_user2(b.organization_id, b.owner_id, 'पैकेज नवीनीकरण', msg, 'https://kalchuri.org/business/' || b.slug, 'biz_pages', b.id, false, true, 'renewal');
    exception when others then null; end;
    n := n + 1;
  end loop;
  return n;
end $$;
do $$ begin
  if not exists (select 1 from cron.job where jobname = 'biz-daily-tick') then
    perform cron.schedule('biz-daily-tick', '35 3 * * *', 'select public.biz_tick()'); -- 09:05 IST
  end if;
end $$;

-- grants -------------------------------------------------------------------------------------------------------------------
revoke all on function public.biz_daily_limit(text), public.biz_month_start(), public.biz_plans_list(), public.biz_plan_save(uuid, text, jsonb),
  public.biz_pay_settings_get(uuid), public.biz_pay_settings_save(uuid, jsonb), public.biz_subscribe(uuid, text, text, text, text, text, date, jsonb),
  public.biz_cancel_request(uuid), public.biz_page_subscriptions(uuid), public.biz_subscriptions_admin(uuid, text), public.biz_apply_plan(uuid),
  public.biz_decide_subscription(uuid, boolean, text), public.biz_grant_plan(uuid, text, int, text), public.biz_sponsor_status(uuid), public.biz_sponsor_post(uuid),
  public.biz_hide_sponsored(uuid), public.biz_sponsored_for_me(uuid, int), public.k1_posts_seen(uuid[]), public.biz_page_json(public.biz_pages), public.biz_tick() from public, anon, authenticated;
grant execute on function public.biz_plans_list(), public.biz_sponsored_for_me(uuid, int) to anon, authenticated;
grant execute on function public.biz_plan_save(uuid, text, jsonb), public.biz_pay_settings_get(uuid), public.biz_pay_settings_save(uuid, jsonb),
  public.biz_subscribe(uuid, text, text, text, text, text, date, jsonb), public.biz_cancel_request(uuid), public.biz_page_subscriptions(uuid),
  public.biz_subscriptions_admin(uuid, text), public.biz_decide_subscription(uuid, boolean, text), public.biz_grant_plan(uuid, text, int, text),
  public.biz_sponsor_status(uuid), public.biz_sponsor_post(uuid), public.biz_hide_sponsored(uuid), public.k1_posts_seen(uuid[]) to authenticated;
