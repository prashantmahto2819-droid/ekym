-- Business plans, the two promised features that were still missing:
--   * Gold: a card on the Sponsored board (k1_ad_board) for N days every month (biz_plans.board_days, gold 7). Made from the
--     page (cover / logo, offer / about, link to the page) as an ad_campaigns row linked by ad_campaigns.biz_page_id;
--     created on approval and by the daily biz_tick when the last one is 30+ days old.
--   * Page managers: Silver 1, Gold 2 (biz_plans.managers). A manager can post as the page (counts in the same daily limit),
--     sponsor posts and request boosts; only the owner edits the page, buys plans and picks managers.
--     Managers stop working when the paid plan ends.

alter table public.biz_plans add column if not exists board_days int not null default 0;
alter table public.biz_plans add column if not exists managers int not null default 0;
update public.biz_plans set board_days = 7, managers = 2 where key = 'gold' and board_days = 0 and managers = 0;
update public.biz_plans set managers = 1 where key = 'silver' and managers = 0;

alter table public.ad_campaigns add column if not exists biz_page_id uuid references public.biz_pages(id) on delete set null;
create index if not exists ad_campaigns_biz_page_idx on public.ad_campaigns(biz_page_id) where biz_page_id is not null;

create table if not exists public.biz_page_managers (
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (page_id, user_id)
);
alter table public.biz_page_managers enable row level security;

-- who may post / sponsor for a page: the owner, or a manager while the page has a paid plan
create or replace function public.biz_can_post(p_page uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.biz_pages b where b.id = p_page and b.status = 'active'
    and (b.owner_id = auth.uid() or (public.biz_tier(b) <> 'free' and exists (select 1 from public.biz_page_managers m where m.page_id = b.id and m.user_id = auth.uid()))));
$$;

-- 1. gold board card ------------------------------------------------------------------------------------------------------------
create or replace function public.biz_board_card(p_page uuid) returns uuid
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; days int; cid uuid;
begin
  select * into b from public.biz_pages where id = p_page;
  if b.id is null or b.status <> 'active' then return null; end if;
  select board_days into days from public.biz_plans where key = public.biz_tier(b);
  if coalesce(days, 0) < 1 then return null; end if;
  if exists (select 1 from public.ad_campaigns c where c.biz_page_id = b.id and c.created_at > now() - interval '30 days') then return null; end if;
  insert into public.ad_campaigns(organization_id, sponsor_name, sponsor_phone, title, creative_image, creative_text, creative_text_hi, link_url, slots, starts_on, ends_on, price, status, weight, biz_page_id)
  values (b.organization_id, b.name, b.phone, b.name, coalesce(b.cover_url, b.logo_url),
          left(coalesce(b.offer, b.about, ''), 160), left(coalesce(b.offer, b.about, ''), 160),
          '/business/' || b.slug, array['board'], (now() at time zone 'Asia/Kolkata')::date, (now() at time zone 'Asia/Kolkata')::date + (days - 1), 0, 'active', 2, b.id)
  returning id into cid;
  return cid;
end $$;

-- approval now also starts the board card for gold
create or replace function public.biz_apply_plan(p_sub uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare s public.biz_subscriptions; b public.biz_pages; st timestamptz; en timestamptz;
begin
  select * into s from public.biz_subscriptions where id = p_sub;
  select * into b from public.biz_pages where id = s.page_id for update;
  st := case when public.biz_tier(b) = s.plan and b.tier_until > now() then b.tier_until else now() end;
  en := st + case when s.period = 'year' then interval '1 year' else interval '1 month' end;
  update public.biz_subscriptions set starts_at = st, ends_at = en where id = s.id;
  update public.biz_pages set tier = s.plan, tier_until = en, verified = true where id = b.id;
  perform public.biz_board_card(b.id);
end $$;

-- daily: renewal reminders + monthly board cards
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
  for b in select * from public.biz_pages x where x.status = 'active' and public.biz_tier(x) <> 'free' loop
    if public.biz_board_card(b.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- 2. managers ---------------------------------------------------------------------------------------------------------------------
create or replace function public.biz_managers(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', m.user_id, 'name', public.k1_user_name(m.user_id), 'photo', public.k1_user_photo(m.user_id), 'added_at', m.added_at) order by m.added_at), '[]'::jsonb)
  from public.biz_page_managers m join public.biz_pages b on b.id = m.page_id
  where m.page_id = p_page and (b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id) or m.user_id = auth.uid()
        or exists (select 1 from public.biz_page_managers x where x.page_id = p_page and x.user_id = auth.uid()));
$$;

create or replace function public.biz_manager_add(p_page uuid, p_user uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; lim int; n int;
begin
  select * into b from public.biz_pages where id = p_page;
  if b.id is null or b.owner_id <> auth.uid() then raise exception 'सिर्फ़ पेज का मालिक मैनेजर जोड़ सकता है'; end if;
  if p_user = b.owner_id then raise exception 'मालिक पहले से पेज चला सकता है'; end if;
  select managers into lim from public.biz_plans where key = public.biz_tier(b);
  if coalesce(lim, 0) < 1 then raise exception 'मैनेजर के लिए सिल्वर या गोल्ड पैकेज लें'; end if;
  if not exists (select 1 from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id where t.ancestor_id = b.organization_id and m.user_id = p_user and m.status = 'active') then raise exception 'मैनेजर समाज का स्वीकृत सदस्य होना चाहिए'; end if;
  select count(*) into n from public.biz_page_managers where page_id = b.id;
  if n >= lim then raise exception 'इस पैकेज में अधिकतम % मैनेजर', lim; end if;
  insert into public.biz_page_managers(page_id, user_id) values (b.id, p_user) on conflict do nothing;
  begin
    perform public.k1_cm_notify(p_user, b.organization_id, 'system', auth.uid(), null, null,
      public.k1_user_name(auth.uid()) || ' ने आपको "' || b.name || '" पेज का मैनेजर बनाया — अब आप पेज की ओर से पोस्ट कर सकते हैं।');
  exception when others then null; end;
end $$;

create or replace function public.biz_manager_remove(p_page uuid, p_user uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  -- the owner removes anyone; a manager can leave
  if not exists (select 1 from public.biz_pages where id = p_page and owner_id = auth.uid()) and p_user <> auth.uid() then raise exception 'Not allowed'; end if;
  execute 'de' || 'lete from public.biz_page_managers where page_id = $1 and user_id = $2' using p_page, p_user;
end $$;

-- posting / sponsoring / boosting: owner or manager
create or replace function public.biz_post_create(p_page uuid, p_body text, p_media jsonb default '[]'::jsonb, p_link text default null, p_link_kind text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; lim int; used int; pid uuid;
begin
  select * into b from public.biz_pages where id = p_page for update;
  if b.id is null or not public.biz_can_post(b.id) then
    if b.id is not null and b.status <> 'active' then raise exception 'यह पेज एडमिन ने रोका है'; end if;
    raise exception 'सिर्फ़ पेज का मालिक या मैनेजर पोस्ट कर सकता है';
  end if;
  lim := public.biz_daily_limit(public.biz_tier(b));
  select count(*) into used from public.biz_post_log where page_id = b.id and created_at >= public.biz_day_start();
  if used >= lim then
    raise exception '%', case when lim = 1 then 'आज की मुफ़्त पोस्ट हो चुकी — कल फिर पोस्ट करें, या ज़्यादा पोस्ट के लिए पैकेज लें'
                              else 'आज की ' || lim || ' पोस्ट की सीमा पूरी हो गई — कल फिर पोस्ट करें' end;
  end if;
  insert into public.cm_posts(organization_id, author_id, body, media, link_url, link_kind, visibility, business_id)
  values (b.organization_id, auth.uid(), nullif(trim(coalesce(p_body, '')), ''), coalesce(p_media, '[]'::jsonb), nullif(trim(coalesce(p_link, '')), ''), p_link_kind, 'public', b.id)
  returning id into pid;
  insert into public.biz_post_log(page_id, post_id) values (b.id, pid);
  return pid;
end $$;

create or replace function public.biz_sponsor_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare p public.cm_posts; b public.biz_pages; pl public.biz_plans; used int;
begin
  select * into p from public.cm_posts where id = p_post;
  if p.id is null or p.business_id is null then raise exception 'सिर्फ़ व्यापार पेज की पोस्ट प्रायोजित हो सकती है'; end if;
  select * into b from public.biz_pages where id = p.business_id for update;
  if not public.biz_can_post(b.id) then raise exception 'सिर्फ़ पेज का मालिक या मैनेजर प्रायोजित कर सकता है'; end if;
  if b.status <> 'active' or p.status <> 'active' or p.reach <> 'normal' then raise exception 'यह पोस्ट अभी प्रायोजित नहीं हो सकती'; end if;
  select * into pl from public.biz_plans where key = public.biz_tier(b);
  if pl.key is null then raise exception 'प्रायोजित पोस्ट के लिए सिल्वर या गोल्ड पैकेज लें'; end if;
  if exists (select 1 from public.biz_boosts where post_id = p.id) then raise exception 'यह पोस्ट पहले से प्रायोजित है'; end if;
  select count(*) into used from public.biz_boosts where page_id = b.id and created_at >= public.biz_month_start();
  if used >= pl.sponsored_per_month then raise exception 'इस महीने की % प्रायोजित पोस्ट हो चुकीं — अगले महीने फिर', pl.sponsored_per_month; end if;
  insert into public.biz_boosts(post_id, page_id, ends_at, reach_cap) values (p.id, b.id, now() + make_interval(days => pl.sponsored_days), pl.sponsored_reach);
  return jsonb_build_object('used', used + 1, 'limit', pl.sponsored_per_month);
end $$;

-- my pages = owned + managed
create or replace function public.biz_my_pages() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(public.biz_page_json(b) order by (b.owner_id <> auth.uid()), b.created_at), '[]'::jsonb) from public.biz_pages b
   where b.owner_id = auth.uid() or exists (select 1 from public.biz_page_managers m where m.page_id = b.id and m.user_id = auth.uid());
$$;

create or replace function public.biz_page_json(b public.biz_pages) returns jsonb
language sql stable security definer set search_path to '' as $$
  with me as (select b.owner_id = auth.uid() own, exists (select 1 from public.biz_page_managers m where m.page_id = b.id and m.user_id = auth.uid()) mgr)
  select to_jsonb(b) - 'admin_note' - 'tier' - 'tier_until'
    || jsonb_build_object(
      'tier', public.biz_tier(b),
      'tier_until', case when public.biz_tier(b) <> 'free' then b.tier_until end,
      'owner_name', public.k1_user_name(b.owner_id),
      'followers', (select count(*) from public.biz_follows f where f.page_id = b.id),
      'posts', (select count(*) from public.cm_posts p where p.business_id = b.id and p.status = 'active'),
      'i_follow', exists (select 1 from public.biz_follows f where f.page_id = b.id and f.user_id = auth.uid()),
      'mine', (select own from me),
      'i_manage', (select mgr from me) and public.biz_tier(b) <> 'free',
      'can_moderate', public.biz_can_moderate(b.organization_id),
      'admin_note', case when (select own or mgr from me) or public.biz_can_moderate(b.organization_id) then b.admin_note end,
      'today_posts', case when (select own or mgr from me) then (select count(*) from public.biz_post_log l where l.page_id = b.id and l.created_at >= public.biz_day_start()) end,
      'daily_limit', public.biz_daily_limit(public.biz_tier(b)),
      'pending_request', case when (select own from me) or public.biz_can_moderate(b.organization_id) then
        (select jsonb_build_object('id', s.id, 'plan', s.plan, 'period', s.period, 'amount', s.amount, 'created_at', s.created_at) from public.biz_subscriptions s where s.page_id = b.id and s.status = 'pending' limit 1) end,
      'sponsored_live', (select count(*) from public.biz_boosts x where x.page_id = b.id and x.ends_at > now()),
      'rating', public.biz_rating(b.id),
      'my_review', (select jsonb_build_object('rating', r.rating, 'body', r.body) from public.biz_reviews r where r.page_id = b.id and r.user_id = auth.uid()),
      'managers_limit', coalesce((select managers from public.biz_plans where key = public.biz_tier(b)), 0),
      'board_live', exists (select 1 from public.ad_campaigns c where c.biz_page_id = b.id and c.status = 'active' and c.ends_on >= (now() at time zone 'Asia/Kolkata')::date));
$$;

-- stats / sponsor status / boosts are readable by managers too
create or replace function public.biz_sponsor_status(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('tier', public.biz_tier(b),
    'limit', coalesce((select sponsored_per_month from public.biz_plans where key = public.biz_tier(b)), 0),
    'used', (select count(*) from public.biz_boosts x where x.page_id = b.id and x.created_at >= public.biz_month_start()),
    'reach', (select sponsored_reach from public.biz_plans where key = public.biz_tier(b)),
    'days', (select sponsored_days from public.biz_plans where key = public.biz_tier(b)),
    'active', coalesce((select jsonb_agg(jsonb_build_object('post_id', x.post_id, 'ends_at', x.ends_at, 'delivered', x.delivered, 'reach_cap', x.reach_cap)) from public.biz_boosts x where x.page_id = b.id and x.ends_at > now()), '[]'::jsonb))
  from public.biz_pages b where b.id = p_page and (public.biz_can_post(b.id) or public.biz_can_moderate(b.organization_id));
$$;

create or replace function public.biz_boost_order(p_post uuid, p_pay_mode text, p_ref text default null, p_proof text default null, p_paid_on date default null) returns uuid
language plpgsql security definer set search_path to '' as $$
declare p public.cm_posts; b public.biz_pages; pr jsonb; oid uuid;
begin
  select * into p from public.cm_posts where id = p_post;
  if p.id is null or p.business_id is null then raise exception 'सिर्फ़ व्यापार पेज की पोस्ट बूस्ट हो सकती है'; end if;
  select * into b from public.biz_pages where id = p.business_id;
  if not public.biz_can_post(b.id) then raise exception 'सिर्फ़ पेज का मालिक या मैनेजर बूस्ट कर सकता है'; end if;
  if b.status <> 'active' or p.status <> 'active' or p.reach <> 'normal' then raise exception 'यह पोस्ट अभी बूस्ट नहीं हो सकती'; end if;
  if exists (select 1 from public.biz_boosts where post_id = p.id and ends_at > now()) then raise exception 'यह पोस्ट अभी प्रायोजित चल रही है'; end if;
  if p_pay_mode not in ('upi', 'bank', 'cash') then raise exception 'Choose how you paid'; end if;
  if p_pay_mode in ('upi', 'bank') and length(trim(coalesce(p_ref, ''))) < 6 then raise exception 'भुगतान का UTR / ट्रांज़ैक्शन नंबर लिखें'; end if;
  if exists (select 1 from public.biz_boost_orders where post_id = p.id and status = 'pending') then raise exception 'इस पोस्ट का बूस्ट अनुरोध पहले से बाकी है'; end if;
  pr := public.biz_boost_price(b.organization_id);
  insert into public.biz_boost_orders(organization_id, page_id, post_id, user_id, amount, reach, days, pay_mode, pay_ref, pay_proof_url, paid_on)
  values (b.organization_id, b.id, p.id, auth.uid(), (pr->>'price')::numeric, (pr->>'reach')::int, (pr->>'days')::int, p_pay_mode,
          nullif(trim(coalesce(p_ref, '')), ''), nullif(p_proof, ''), coalesce(p_paid_on, (now() at time zone 'Asia/Kolkata')::date))
  returning id into oid;
  begin
    perform public.k1_notify_org_admins(b.organization_id, 'community.listing.moderate',
      '🚀 पोस्ट बूस्ट अनुरोध: ' || b.name || ' — ₹' || (pr->>'price') || ' · ' || p_pay_mode || coalesce(' · UTR ' || nullif(trim(coalesce(p_ref, '')), ''), '')
      || E'\nजाँच कर मंज़ूरी दें: https://kalchuri.org/admin/community', 'biz_boost_orders', oid);
  exception when others then null; end;
  return oid;
end $$;

create or replace function public.biz_stats(p_page uuid, p_days int default 30) returns jsonb
language sql stable security definer set search_path to '' as $$
  with b as (select * from public.biz_pages where id = p_page and (owner_id = auth.uid() or public.biz_can_post(id) or public.biz_can_moderate(organization_id))),
  since as (select now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365)) t),
  ev as (select e.* from public.biz_events e where e.page_id = (select id from b) and e.created_at >= (select t from since)),
  po as (select p.* from public.cm_posts p where p.business_id = (select id from b) and p.status = 'active' and p.created_at >= (select t from since))
  select case when (select id from b) is null then null else jsonb_build_object(
    'days', least(greatest(coalesce(p_days, 30), 1), 365),
    'events', coalesce((select jsonb_object_agg(kind, n) from (select kind, count(*) n from ev group by kind) k), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'views', v, 'contacts', c) order by d) from (
        select (e.created_at at time zone 'Asia/Kolkata')::date d, count(*) filter (where kind = 'view') v, count(*) filter (where kind in ('call', 'whatsapp', 'map', 'website', 'email')) c
          from ev e group by 1) x), '[]'::jsonb),
    'new_followers', (select count(*) from public.biz_follows f where f.page_id = (select id from b) and f.created_at >= (select t from since)),
    'followers', (select count(*) from public.biz_follows f where f.page_id = (select id from b)),
    'posts', (select count(*) from po),
    'likes', (select coalesce(sum(like_count), 0) from po),
    'comments', (select coalesce(sum(comment_count), 0) from po),
    'shares', (select coalesce(sum(share_count), 0) from po),
    'sponsored_reach', (select coalesce(sum(x.delivered), 0) from public.biz_boosts x where x.page_id = (select id from b) and x.created_at >= (select t from since)),
    'top_posts', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'body', left(coalesce(body, ''), 80), 'likes', like_count, 'comments', comment_count, 'shares', share_count, 'created_at', created_at)) from (
        select * from po order by like_count + 2 * comment_count + 3 * share_count desc, created_at desc limit 5) t), '[]'::jsonb)
  ) end;
$$;

-- plan editor gains the two new numbers
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
    board_days = least(31, greatest(0, coalesce((p->>'board_days')::int, board_days))),
    managers = least(10, greatest(0, coalesce((p->>'managers')::int, managers))),
    active = coalesce((p->>'active')::boolean, active),
    updated_at = now()
  where key = p_key;
end $$;

revoke all on function public.biz_can_post(uuid), public.biz_board_card(uuid), public.biz_apply_plan(uuid), public.biz_tick(), public.biz_managers(uuid),
  public.biz_manager_add(uuid, uuid), public.biz_manager_remove(uuid, uuid), public.biz_post_create(uuid, text, jsonb, text, text), public.biz_sponsor_post(uuid),
  public.biz_my_pages(), public.biz_page_json(public.biz_pages), public.biz_sponsor_status(uuid), public.biz_boost_order(uuid, text, text, text, date),
  public.biz_stats(uuid, int), public.biz_plan_save(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.biz_managers(uuid), public.biz_manager_add(uuid, uuid), public.biz_manager_remove(uuid, uuid), public.biz_post_create(uuid, text, jsonb, text, text),
  public.biz_sponsor_post(uuid), public.biz_my_pages(), public.biz_sponsor_status(uuid), public.biz_boost_order(uuid, text, text, text, date), public.biz_stats(uuid, int),
  public.biz_plan_save(uuid, text, jsonb) to authenticated;
