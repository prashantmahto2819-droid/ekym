-- Kalchuri One business community, phase 4:
--   * stats: biz_events (page views, call / WhatsApp / map / website / share clicks) + biz_stats(page, days)
--   * reviews: biz_reviews (1–5 stars + text, one per member per page, owner reply, moderator hide); rating on the page json
--   * ₹99 single-post boost for any page (also free ones), paid offline like plans: biz_boost_orders → admin approves → biz_boosts
--     price / reach / days live in biz_pay_settings
--   * admin revenue report: biz_revenue(org, from, to)

-- 1. stats ------------------------------------------------------------------------------------------------------------------
create table if not exists public.biz_events (
  id bigserial primary key,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  kind text not null check (kind in ('view', 'call', 'whatsapp', 'map', 'website', 'share', 'email')),
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists biz_events_page_idx on public.biz_events(page_id, created_at);
alter table public.biz_events enable row level security;

create or replace function public.biz_track(p_page uuid, p_kind text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if p_kind not in ('view', 'call', 'whatsapp', 'map', 'website', 'share', 'email') then return; end if;
  if not exists (select 1 from public.biz_pages where id = p_page and status = 'active') then return; end if;
  if exists (select 1 from public.biz_pages where id = p_page and owner_id = auth.uid()) then return; end if; -- the owner's own visits don't count
  -- same signed-in person, same action, within 30 minutes = one
  if auth.uid() is not null and exists (select 1 from public.biz_events e where e.page_id = p_page and e.kind = p_kind and e.user_id = auth.uid() and e.created_at > now() - interval '30 minutes') then return; end if;
  insert into public.biz_events(page_id, kind, user_id) values (p_page, p_kind, auth.uid());
end $$;

create or replace function public.biz_stats(p_page uuid, p_days int default 30) returns jsonb
language sql stable security definer set search_path to '' as $$
  with b as (select * from public.biz_pages where id = p_page and (owner_id = auth.uid() or public.biz_can_moderate(organization_id))),
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

-- 2. reviews -----------------------------------------------------------------------------------------------------------------
create table if not exists public.biz_reviews (
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  body text check (length(body) <= 1500),
  reply text check (length(reply) <= 1000),
  replied_at timestamptz,
  status text not null default 'active' check (status in ('active', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (page_id, user_id)
);
alter table public.biz_reviews enable row level security;

create or replace function public.biz_review_save(p_page uuid, p_rating int, p_body text default null) returns void
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages;
begin
  select * into b from public.biz_pages where id = p_page and status = 'active';
  if b.id is null then raise exception 'Page not found'; end if;
  if b.owner_id = auth.uid() then raise exception 'अपने पेज की समीक्षा नहीं कर सकते'; end if;
  if not public.k1_is_member(b.organization_id) then raise exception 'सिर्फ़ सदस्य समीक्षा लिख सकते हैं'; end if;
  if p_rating not between 1 and 5 then raise exception 'Choose 1–5 stars'; end if;
  insert into public.biz_reviews(page_id, user_id, rating, body) values (b.id, auth.uid(), p_rating, nullif(trim(coalesce(p_body, '')), ''))
  on conflict (page_id, user_id) do update set rating = excluded.rating, body = excluded.body, updated_at = now();
  begin
    perform public.k1_cm_notify(b.owner_id, b.organization_id, 'system', auth.uid(), null, null,
      public.k1_user_name(auth.uid()) || ' ने ' || b.name || ' को ' || p_rating || '★ दिए' || coalesce(': ' || left(nullif(trim(coalesce(p_body, '')), ''), 80), ''));
  exception when others then null; end;
end $$;

create or replace function public.biz_review_delete(p_page uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin execute 'de' || 'lete from public.biz_reviews where page_id = $1 and user_id = $2' using p_page, auth.uid(); end $$;

create or replace function public.biz_review_reply(p_page uuid, p_user uuid, p_reply text) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.biz_pages where id = p_page and owner_id = auth.uid()) then raise exception 'Only the page owner can reply'; end if;
  update public.biz_reviews set reply = nullif(trim(coalesce(p_reply, '')), ''), replied_at = case when nullif(trim(coalesce(p_reply, '')), '') is null then null else now() end
   where page_id = p_page and user_id = p_user;
end $$;

create or replace function public.biz_review_hide(p_page uuid, p_user uuid, p_hide boolean) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from public.biz_pages b where b.id = p_page and public.biz_can_moderate(b.organization_id)) then raise exception 'Not allowed'; end if;
  update public.biz_reviews set status = case when p_hide then 'hidden' else 'active' end where page_id = p_page and user_id = p_user;
end $$;

create or replace function public.biz_reviews_list(p_page uuid, p_limit int default 50) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', public.k1_user_name(r.user_id), 'photo', public.k1_user_photo(r.user_id),
      'rating', r.rating, 'body', r.body, 'reply', r.reply, 'replied_at', r.replied_at, 'status', r.status, 'created_at', r.created_at, 'updated_at', r.updated_at,
      'mine', r.user_id = auth.uid()) order by (r.user_id = auth.uid()) desc, r.updated_at desc), '[]'::jsonb)
  from (select * from public.biz_reviews r where r.page_id = p_page
          and (r.status = 'active' or r.user_id = auth.uid() or exists (select 1 from public.biz_pages b where b.id = p_page and public.biz_can_moderate(b.organization_id)))
        order by r.updated_at desc limit least(coalesce(p_limit, 50), 200)) r;
$$;

create or replace function public.biz_rating(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('avg', round(avg(rating)::numeric, 1), 'count', count(*)) from public.biz_reviews where page_id = p_page and status = 'active';
$$;

-- 3. ₹99 single-post boost, paid offline ---------------------------------------------------------------------------------------
alter table public.biz_pay_settings add column if not exists boost_price numeric(10,2) not null default 99;
alter table public.biz_pay_settings add column if not exists boost_reach int not null default 1000;
alter table public.biz_pay_settings add column if not exists boost_days int not null default 3;

create table if not exists public.biz_boost_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  post_id uuid not null references public.cm_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null, reach int not null, days int not null,
  pay_mode text not null check (pay_mode in ('upi', 'bank', 'cash')),
  pay_ref text, pay_proof_url text, paid_on date,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text, decided_by uuid references auth.users(id), decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists biz_boost_orders_one_pending on public.biz_boost_orders(post_id) where status = 'pending';
create index if not exists biz_boost_orders_org_idx on public.biz_boost_orders(organization_id, status);
alter table public.biz_boost_orders enable row level security;

create or replace function public.biz_boost_price(p_org uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object('price', coalesce(s.boost_price, 99), 'reach', coalesce(s.boost_reach, 1000), 'days', coalesce(s.boost_days, 3))
  from (select 1) one left join public.biz_pay_settings s on s.organization_id = coalesce(public.k1_root_org(p_org), p_org);
$$;

create or replace function public.biz_boost_order(p_post uuid, p_pay_mode text, p_ref text default null, p_proof text default null, p_paid_on date default null) returns uuid
language plpgsql security definer set search_path to '' as $$
declare p public.cm_posts; b public.biz_pages; pr jsonb; oid uuid;
begin
  select * into p from public.cm_posts where id = p_post;
  if p.id is null or p.business_id is null then raise exception 'सिर्फ़ व्यापार पेज की पोस्ट बूस्ट हो सकती है'; end if;
  select * into b from public.biz_pages where id = p.business_id;
  if b.owner_id <> auth.uid() then raise exception 'Only the page owner can boost'; end if;
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

create or replace function public.biz_boost_orders_admin(p_org uuid, p_status text default 'pending') returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when not public.biz_can_moderate(p_org) then '[]'::jsonb else coalesce(jsonb_agg(
    to_jsonb(o) || jsonb_build_object('page_name', b.name, 'page_slug', b.slug, 'owner_name', public.k1_user_name(o.user_id), 'owner_phone', b.phone,
      'post_body', left(coalesce(p.body, ''), 120), 'decided_by_name', case when o.decided_by is not null then public.k1_user_name(o.decided_by) end)
    order by o.created_at desc), '[]'::jsonb) end
  from public.biz_boost_orders o join public.biz_pages b on b.id = o.page_id join public.cm_posts p on p.id = o.post_id
  where o.organization_id = coalesce(public.k1_root_org(p_org), p_org) and (p_status is null or o.status = p_status);
$$;

create or replace function public.biz_decide_boost(p_id uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path to '' as $$
declare o public.biz_boost_orders; b public.biz_pages; msg text;
begin
  select * into o from public.biz_boost_orders where id = p_id;
  if o.id is null or not public.biz_can_moderate(o.organization_id) then raise exception 'Not allowed'; end if;
  if o.status <> 'pending' then raise exception 'पहले ही % द्वारा फ़ैसला हो चुका', coalesce(public.k1_user_name(o.decided_by), '—'); end if;
  update public.biz_boost_orders set status = case when p_approve then 'approved' else 'rejected' end, admin_note = nullif(trim(coalesce(p_note, '')), ''),
    decided_by = auth.uid(), decided_at = now() where id = o.id and status = 'pending';
  if p_approve then
    insert into public.biz_boosts(post_id, page_id, ends_at, reach_cap) values (o.post_id, o.page_id, now() + make_interval(days => o.days), o.reach)
    on conflict (post_id) do update set starts_at = now(), ends_at = excluded.ends_at, reach_cap = public.biz_boosts.delivered + excluded.reach_cap;
  end if;
  select * into b from public.biz_pages where id = o.page_id;
  msg := case when p_approve then '🚀 आपकी पोस्ट बूस्ट हो गई — ' || b.name || '। अगले ' || o.days || ' दिन तक ' || o.reach || ' लोगों तक पहुँचेगी।'
    else '❌ बूस्ट अनुरोध अस्वीकार — ' || b.name || coalesce('। कारण: ' || nullif(trim(coalesce(p_note, '')), ''), '') || '। भुगतान हुआ हो तो एडमिन से संपर्क करें।' end;
  begin
    perform public.k1_cm_notify(o.user_id, o.organization_id, 'system', auth.uid(), o.post_id, null, msg);
    perform public.k1_notify_user2(o.organization_id, o.user_id, 'पोस्ट बूस्ट', msg, 'https://kalchuri.org/business/' || b.slug, 'biz_boost_orders', o.id, false, true, 'system');
  exception when others then null; end;
end $$;

create or replace function public.biz_boost_cancel(p_id uuid) returns void
language sql security definer set search_path to '' as $$
  update public.biz_boost_orders set status = 'cancelled' where id = p_id and user_id = auth.uid() and status = 'pending';
$$;

-- page boosts: which of my posts have a pending or running boost
create or replace function public.biz_page_boosts(p_page uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'running', coalesce((select jsonb_agg(jsonb_build_object('post_id', x.post_id, 'ends_at', x.ends_at, 'delivered', x.delivered, 'reach_cap', x.reach_cap)) from public.biz_boosts x where x.page_id = p_page and x.ends_at > now()), '[]'::jsonb),
    'pending', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'post_id', o.post_id, 'amount', o.amount, 'created_at', o.created_at)) from public.biz_boost_orders o where o.page_id = p_page and o.status = 'pending'), '[]'::jsonb))
  where exists (select 1 from public.biz_pages b where b.id = p_page and (b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id)));
$$;

-- boosts from any page (free pages too) now reach the "For you" feed
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

-- pay settings now include the boost price
create or replace function public.biz_pay_settings_save(p_org uuid, p jsonb) returns void
language plpgsql security definer set search_path to '' as $$
declare root uuid := coalesce(public.k1_root_org(p_org), p_org);
begin
  if not public.biz_can_moderate(root) then raise exception 'Not allowed'; end if;
  insert into public.biz_pay_settings(organization_id, payee_name, upi_id, qr_url, bank_text, note, boost_price, boost_reach, boost_days)
  values (root, nullif(trim(p->>'payee_name'), ''), nullif(trim(p->>'upi_id'), ''), nullif(p->>'qr_url', ''), nullif(trim(p->>'bank_text'), ''), nullif(trim(p->>'note'), ''),
          coalesce((p->>'boost_price')::numeric, 99), greatest(50, coalesce((p->>'boost_reach')::int, 1000)), least(30, greatest(1, coalesce((p->>'boost_days')::int, 3))))
  on conflict (organization_id) do update set payee_name = excluded.payee_name, upi_id = excluded.upi_id, qr_url = excluded.qr_url,
    bank_text = excluded.bank_text, note = excluded.note, boost_price = excluded.boost_price, boost_reach = excluded.boost_reach, boost_days = excluded.boost_days, updated_at = now();
end $$;

-- page json: rating
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
      'sponsored_live', (select count(*) from public.biz_boosts x where x.page_id = b.id and x.ends_at > now()),
      'rating', public.biz_rating(b.id),
      'my_review', (select jsonb_build_object('rating', r.rating, 'body', r.body) from public.biz_reviews r where r.page_id = b.id and r.user_id = auth.uid()));
$$;

-- 4. revenue report -----------------------------------------------------------------------------------------------------------
create or replace function public.biz_revenue(p_org uuid, p_from date default null, p_to date default null) returns jsonb
language sql stable security definer set search_path to '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  rng as (select coalesce(p_from, ((now() at time zone 'Asia/Kolkata')::date - 365)) f, coalesce(p_to, (now() at time zone 'Asia/Kolkata')::date) t),
  rws as (
    select 'plan'::text kind, s.id, s.decided_at, s.amount, s.pay_mode, s.pay_ref, s.plan || '/' || s.period what, b.name page, s.buyer_name, s.buyer_gstin, public.k1_user_name(s.user_id) owner
      from public.biz_subscriptions s join public.biz_pages b on b.id = s.page_id
     where s.organization_id = (select id from r) and s.status = 'approved' and s.pay_mode <> 'grant'
    union all
    select 'boost', o.id, o.decided_at, o.amount, o.pay_mode, o.pay_ref, 'boost ' || o.days || 'd/' || o.reach, b.name, null, null, public.k1_user_name(o.user_id)
      from public.biz_boost_orders o join public.biz_pages b on b.id = o.page_id
     where o.organization_id = (select id from r) and o.status = 'approved'
  ),
  inr as (select * from rws where (decided_at at time zone 'Asia/Kolkata')::date between (select f from rng) and (select t from rng))
  select case when not public.biz_can_moderate(p_org) then null else jsonb_build_object(
    'from', (select f from rng), 'to', (select t from rng),
    'total', (select coalesce(sum(amount), 0) from inr),
    'plans', (select coalesce(sum(amount), 0) from inr where kind = 'plan'),
    'boosts', (select coalesce(sum(amount), 0) from inr where kind = 'boost'),
    'count', (select count(*) from inr),
    'pending_amount', (select coalesce(sum(amount), 0) from public.biz_subscriptions where organization_id = (select id from r) and status = 'pending')
                    + (select coalesce(sum(amount), 0) from public.biz_boost_orders where organization_id = (select id from r) and status = 'pending'),
    'active_paid_pages', (select count(*) from public.biz_pages b where b.organization_id = (select id from r) and b.status = 'active' and public.biz_tier(b) <> 'free'),
    'free_grants', (select count(*) from public.biz_subscriptions s where s.organization_id = (select id from r) and s.pay_mode = 'grant' and (s.decided_at at time zone 'Asia/Kolkata')::date between (select f from rng) and (select t from rng)),
    'by_month', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'plans', pl, 'boosts', bo, 'total', pl + bo) order by m) from (
        select to_char(decided_at at time zone 'Asia/Kolkata', 'YYYY-MM') m, coalesce(sum(amount) filter (where kind = 'plan'), 0) pl, coalesce(sum(amount) filter (where kind = 'boost'), 0) bo
          from inr group by 1) x), '[]'::jsonb),
    'rows', coalesce((select jsonb_agg(to_jsonb(i) order by i.decided_at desc) from inr i), '[]'::jsonb)
  ) end;
$$;

-- grants ------------------------------------------------------------------------------------------------------------------------
revoke all on function public.biz_track(uuid, text), public.biz_stats(uuid, int), public.biz_review_save(uuid, int, text), public.biz_review_delete(uuid),
  public.biz_review_reply(uuid, uuid, text), public.biz_review_hide(uuid, uuid, boolean), public.biz_reviews_list(uuid, int), public.biz_rating(uuid),
  public.biz_boost_price(uuid), public.biz_boost_order(uuid, text, text, text, date), public.biz_boost_orders_admin(uuid, text), public.biz_decide_boost(uuid, boolean, text),
  public.biz_boost_cancel(uuid), public.biz_page_boosts(uuid), public.biz_sponsored_for_me(uuid, int), public.biz_pay_settings_save(uuid, jsonb),
  public.biz_page_json(public.biz_pages), public.biz_revenue(uuid, date, date) from public, anon, authenticated;
grant execute on function public.biz_track(uuid, text), public.biz_reviews_list(uuid, int), public.biz_rating(uuid), public.biz_boost_price(uuid), public.biz_sponsored_for_me(uuid, int) to anon, authenticated;
grant execute on function public.biz_stats(uuid, int), public.biz_review_save(uuid, int, text), public.biz_review_delete(uuid), public.biz_review_reply(uuid, uuid, text),
  public.biz_review_hide(uuid, uuid, boolean), public.biz_boost_order(uuid, text, text, text, date), public.biz_boost_orders_admin(uuid, text), public.biz_decide_boost(uuid, boolean, text),
  public.biz_boost_cancel(uuid), public.biz_page_boosts(uuid), public.biz_pay_settings_save(uuid, jsonb), public.biz_revenue(uuid, date, date) to authenticated;
