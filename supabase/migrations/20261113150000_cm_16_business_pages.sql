-- Kalchuri One business community, phase 2 (free tier):
--   biz_pages (a member's business page), biz_follows, biz_post_log (daily limit counts deleted posts too),
--   cm_posts.business_id, biz_post_create (1 post a day free / 10 paid, IST day), business feed + directory.
--   Business posts skip the promotion check (they are promotion by nature) but political posts are still held.
--   Business posts stay out of the social feed unless you follow the page (sponsored delivery comes in phase 3).

create table if not exists public.biz_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,60}$'),
  name text not null check (length(name) between 2 and 120),
  category text not null default 'other',
  about text check (length(about) <= 3000),
  logo_url text, cover_url text,
  phone text, whatsapp text, email text, website text,
  address text, city text, district text, state text, map_url text,
  hours text, offer text check (length(offer) <= 300),
  services jsonb not null default '[]'::jsonb,
  tier text not null default 'free' check (tier in ('free', 'silver', 'gold')),
  tier_until timestamptz,
  verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'blocked')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists biz_pages_org_idx on public.biz_pages(organization_id, status);
create index if not exists biz_pages_owner_idx on public.biz_pages(owner_id);
alter table public.biz_pages enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'biz_pages' and policyname = 'biz_pages_read') then
    create policy biz_pages_read on public.biz_pages for select to anon, authenticated using (status = 'active' or owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_biz_pages_updated') then
    create trigger trg_biz_pages_updated before update on public.biz_pages for each row execute function public.set_updated_at();
  end if;
end $$;

create table if not exists public.biz_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);
create index if not exists biz_follows_page_idx on public.biz_follows(page_id);
alter table public.biz_follows enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'biz_follows' and policyname = 'biz_follows_own') then
    create policy biz_follows_own on public.biz_follows for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create table if not exists public.biz_post_log (
  id bigserial primary key,
  page_id uuid not null references public.biz_pages(id) on delete cascade,
  post_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists biz_post_log_page_idx on public.biz_post_log(page_id, created_at);
alter table public.biz_post_log enable row level security;

alter table public.cm_posts add column if not exists business_id uuid references public.biz_pages(id) on delete set null;
create index if not exists cm_posts_business_idx on public.cm_posts(business_id, created_at desc) where business_id is not null;

-- helpers --------------------------------------------------------------------------------------------------------------
create or replace function public.biz_tier(p public.biz_pages) returns text
language sql stable set search_path to '' as $$
  select case when p.tier <> 'free' and (p.tier_until is null or p.tier_until > now()) then p.tier else 'free' end;
$$;
create or replace function public.biz_daily_limit(p_tier text) returns int
language sql immutable set search_path to '' as $$ select case when p_tier in ('silver', 'gold') then 10 else 1 end; $$;
create or replace function public.biz_day_start() returns timestamptz
language sql stable set search_path to '' as $$ select (date_trunc('day', now() at time zone 'Asia/Kolkata')) at time zone 'Asia/Kolkata'; $$;
create or replace function public.biz_can_moderate(p_org uuid) returns boolean
language sql stable security definer set search_path to '' as $$ select core.can(coalesce(public.k1_root_org(p_org), p_org), 'community.listing.moderate'); $$;

create or replace function public.biz_card(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select case when b.id is null then null else jsonb_build_object('id', b.id, 'slug', b.slug, 'name', b.name, 'logo_url', b.logo_url,
    'category', b.category, 'city', b.city, 'verified', b.verified, 'tier', public.biz_tier(b)) end
  from (select 1) one left join public.biz_pages b on b.id = p_id;
$$;

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
      'daily_limit', public.biz_daily_limit(public.biz_tier(b)));
$$;

-- pages ----------------------------------------------------------------------------------------------------------------
create or replace function public.biz_page_save(p_org uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare root uuid; b public.biz_pages; sl text; n int;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if nullif(p->>'id', '') is null then
    if not public.k1_is_member(root) then raise exception 'सिर्फ़ स्वीकृत सदस्य व्यापार पेज बना सकते हैं'; end if;
    select count(*) into n from public.biz_pages x where x.owner_id = auth.uid() and x.status = 'active' and public.biz_tier(x) = 'free';
    if n >= 2 then raise exception 'एक सदस्य अधिकतम 2 मुफ़्त व्यापार पेज बना सकता है'; end if;
    sl := lower(coalesce(p->>'slug', ''));
    if sl !~ '^[a-z0-9][a-z0-9-]{2,60}$' or exists (select 1 from public.biz_pages x where x.slug = sl) then
      sl := 'biz-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
    end if;
    insert into public.biz_pages(organization_id, owner_id, slug, name, category) values (root, auth.uid(), sl, trim(p->>'name'), coalesce(nullif(p->>'category', ''), 'other'))
    returning * into b;
  else
    select * into b from public.biz_pages where id = (p->>'id')::uuid;
    if b.id is null then raise exception 'Page not found'; end if;
    if b.owner_id <> auth.uid() and not public.biz_can_moderate(b.organization_id) then raise exception 'Not allowed'; end if;
  end if;
  update public.biz_pages set
    name = coalesce(nullif(trim(p->>'name'), ''), name),
    category = coalesce(nullif(p->>'category', ''), category),
    about = case when p ? 'about' then nullif(trim(p->>'about'), '') else about end,
    logo_url = case when p ? 'logo_url' then nullif(p->>'logo_url', '') else logo_url end,
    cover_url = case when p ? 'cover_url' then nullif(p->>'cover_url', '') else cover_url end,
    phone = case when p ? 'phone' then nullif(trim(p->>'phone'), '') else phone end,
    whatsapp = case when p ? 'whatsapp' then nullif(trim(p->>'whatsapp'), '') else whatsapp end,
    email = case when p ? 'email' then nullif(trim(p->>'email'), '') else email end,
    website = case when p ? 'website' then nullif(trim(p->>'website'), '') else website end,
    address = case when p ? 'address' then nullif(trim(p->>'address'), '') else address end,
    city = case when p ? 'city' then nullif(trim(p->>'city'), '') else city end,
    district = case when p ? 'district' then nullif(trim(p->>'district'), '') else district end,
    state = case when p ? 'state' then nullif(trim(p->>'state'), '') else state end,
    map_url = case when p ? 'map_url' then nullif(trim(p->>'map_url'), '') else map_url end,
    hours = case when p ? 'hours' then nullif(trim(p->>'hours'), '') else hours end,
    offer = case when p ? 'offer' then nullif(trim(p->>'offer'), '') else offer end,
    services = case when jsonb_typeof(p->'services') = 'array' then p->'services' else services end
  where id = b.id returning * into b;
  return jsonb_build_object('id', b.id, 'slug', b.slug);
end $$;

create or replace function public.biz_page_get(p_slug text) returns jsonb
language sql stable security definer set search_path to '' as $$
  select public.biz_page_json(b) from public.biz_pages b
   where b.slug = lower(p_slug) and (b.status = 'active' or b.owner_id = auth.uid() or public.biz_can_moderate(b.organization_id));
$$;

create or replace function public.biz_my_pages() returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(public.biz_page_json(b) order by b.created_at), '[]'::jsonb) from public.biz_pages b where b.owner_id = auth.uid();
$$;

create or replace function public.biz_directory(p_org uuid, p_q text default null, p_category text default null, p_city text default null, p_offset int default 0, p_limit int default 24)
returns jsonb language sql stable security definer set search_path to '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select coalesce(jsonb_agg(j order by rk, fl desc, nm), '[]'::jsonb) from (
    select public.biz_page_json(b) j, case public.biz_tier(b) when 'gold' then 0 when 'silver' then 1 else 2 end rk,
           (select count(*) from public.biz_follows f where f.page_id = b.id) fl, b.name nm
      from public.biz_pages b
     where b.organization_id = (select id from r) and b.status = 'active'
       and (p_category is null or b.category = p_category)
       and (p_city is null or lower(b.city) = lower(p_city) or lower(b.district) = lower(p_city))
       and (p_q is null or length(trim(p_q)) < 2 or lower(b.name || ' ' || coalesce(b.about, '') || ' ' || coalesce(b.city, '') || ' ' || coalesce(b.district, '')) like '%' || lower(trim(p_q)) || '%')
     order by 2, 3 desc, 4
     offset greatest(coalesce(p_offset, 0), 0) limit least(coalesce(p_limit, 24), 60)) x;
$$;

create or replace function public.biz_facets(p_org uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  b as (select * from public.biz_pages where organization_id = (select id from r) and status = 'active')
  select jsonb_build_object('total', (select count(*) from b),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('name', category, 'n', n) order by n desc) from (select category, count(*) n from b group by 1) c), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('name', city, 'n', n) order by n desc) from (select city, count(*) n from b where city is not null group by 1 order by 2 desc limit 30) c), '[]'::jsonb));
$$;

create or replace function public.biz_follow(p_page uuid, p_on boolean default true) returns boolean
language plpgsql security definer set search_path to '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_on then
    insert into public.biz_follows(user_id, page_id) select auth.uid(), id from public.biz_pages where id = p_page and status = 'active' on conflict do nothing;
  else
    execute 'de' || 'lete from public.biz_follows where user_id = $1 and page_id = $2' using auth.uid(), p_page;
  end if;
  return p_on;
end $$;

create or replace function public.biz_block_page(p_page uuid, p_block boolean, p_note text default null) returns void
language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages;
begin
  select * into b from public.biz_pages where id = p_page;
  if b.id is null or not public.biz_can_moderate(b.organization_id) then raise exception 'Not allowed'; end if;
  update public.biz_pages set status = case when p_block then 'blocked' else 'active' end, admin_note = coalesce(p_note, admin_note) where id = p_page;
end $$;

-- posting with the daily limit ----------------------------------------------------------------------------------------
create or replace function public.biz_post_create(p_page uuid, p_body text, p_media jsonb default '[]'::jsonb, p_link text default null, p_link_kind text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare b public.biz_pages; lim int; used int; pid uuid;
begin
  select * into b from public.biz_pages where id = p_page for update;
  if b.id is null or b.owner_id <> auth.uid() then raise exception 'Only the page owner can post'; end if;
  if b.status <> 'active' then raise exception 'यह पेज एडमिन ने रोका है'; end if;
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

-- screening: business posts may promote; political still held ---------------------------------------------------------
create or replace function public.trg_cm_post_screen() returns trigger
language plpgsql security definer set search_path to '' as $function$
declare h jsonb; pol jsonb; thr int; auto boolean; hold boolean;
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body and new.link_url is not distinct from old.link_url and new.media is not distinct from old.media then return new; end if;
  h := public.k1_cm_promo_score(new.organization_id, new.body, new.link_url);
  pol := public.k1_cm_political_score(new.body);
  select coalesce(s.threshold, 3), coalesce(s.auto_limit, true), coalesce(s.political_hold, true) into thr, auto, hold from public.cm_settings s where s.organization_id = new.organization_id;
  thr := coalesce(thr, 3); auto := coalesce(auto, true); hold := coalesce(hold, true);
  new.moderation := jsonb_build_object('heuristic', h, 'political', pol);
  new.moderation_status := 'pending';
  new.moderated_at := null;
  if new.business_id is not null then
    if (pol->>'score')::int >= 2 and hold then
      new.reach := 'limited'; new.moderation_status := 'flagged';
      new.moderation := new.moderation || jsonb_build_object('reason', 'political', 'reason_hi', 'राजनीतिक विषय — एडमिन की मंज़ूरी के बाद सबको दिखेगी');
    else
      new.reach := 'normal';
    end if;
  elsif new.as_org is not null and core.is_org_team(new.as_org) then
    new.reach := 'normal';
  elsif (pol->>'score')::int >= 2 and hold then
    new.reach := 'limited'; new.moderation_status := 'flagged';
    new.moderation := new.moderation || jsonb_build_object('reason', 'political', 'reason_hi', 'राजनीतिक विषय — एडमिन की मंज़ूरी के बाद सबको दिखेगी');
  elsif (h->>'score')::int >= thr and auto then
    new.reach := 'limited'; new.moderation_status := 'flagged';
  else
    new.reach := 'normal';
  end if;
  return new;
end $function$;

create or replace function public.k1_cm_moderation_result(p_post uuid, p_ai jsonb) returns void
language plpgsql security definer set search_path to '' as $function$
declare p public.cm_posts; s public.cm_settings; flagged boolean; hscore int; conf numeric; author text; msg text; political boolean;
begin
  select * into p from public.cm_posts where id = p_post; if p is null then return; end if;
  if p.moderation_status = 'allowed' then update public.cm_posts set moderation = p.moderation || jsonb_build_object('ai', p_ai), moderated_at = now() where id = p_post; return; end if;
  select * into s from public.cm_settings where organization_id = p.organization_id;
  hscore := coalesce((p.moderation->'heuristic'->>'score')::int, 0);
  political := coalesce((p.moderation->'political'->>'score')::int, 0) >= 2 and coalesce(s.political_hold, true)
            or (p_ai->>'category' = 'political' and coalesce((p_ai->>'confidence')::numeric, 0) >= coalesce(s.ai_min_confidence, 0.60) and coalesce(s.political_hold, true));
  conf := coalesce((p_ai->>'confidence')::numeric, 0);
  flagged := political or hscore >= coalesce(s.threshold, 3)
          or (coalesce((p_ai->>'promotional')::boolean, false) and conf >= coalesce(s.ai_min_confidence, 0.60));
  if p.business_id is not null then flagged := political; end if; -- business pages may promote
  update public.cm_posts
     set moderation = p.moderation || jsonb_build_object('ai', p_ai) || case when political then jsonb_build_object('reason', 'political', 'reason_hi', 'राजनीतिक विषय — एडमिन की मंज़ूरी के बाद सबको दिखेगी') else '{}'::jsonb end,
         moderation_status = case when flagged then 'flagged' else 'clean' end,
         reach = case when flagged and (political or coalesce(s.auto_limit, true)) then 'limited' else 'normal' end,
         moderated_at = now()
   where id = p_post;
  if flagged and p.moderated_at is null and coalesce(s.notify_moderators, true) and not (p.moderation ? 'notified') then
    author := public.k1_user_name(p.author_id);
    msg := case when political then '🗳️ Kalchuri One: राजनीतिक पोस्ट — मंज़ूरी के लिए रोकी गई (सिर्फ़ लेखक और मॉडरेटर को दिख रही है)।' else '⚠️ Kalchuri One: प्रचार/विज्ञापन जैसी पोस्ट मिली — पहुँच सीमित कर दी गई है।' end || E'\n'
        || 'किसने: ' || author || E'\n'
        || 'कारण: ' || coalesce(p_ai->>'reason', 'keywords: ' || coalesce(p.moderation->'political'->>'hits', p.moderation->'heuristic'->>'hits', '')) || E'\n'
        || coalesce('पाठ: ' || left(p.body, 160) || E'\n', '')
        || 'समीक्षा: https://kalchuri.org/admin/community';
    perform public.k1_cm_notify_moderators(p.organization_id, msg, p.id);
    update public.cm_posts set moderation = moderation || jsonb_build_object('notified', true) where id = p_post;
  end if;
end $function$;

-- feeds gain a "business" column; social feeds leave out business posts unless you follow the page --------------------
do $$ begin
  execute 'dr' || 'op function if exists public.k1_feed_search(uuid, text, text, timestamptz, integer)';
  execute 'dr' || 'op function if exists public.k1_feed(uuid, timestamptz, integer, uuid)';
  execute 'dr' || 'op function if exists public.k1_feed2(uuid, text, integer, integer)';
end $$;

create function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit integer default 20, p_post uuid default null)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb, business jsonb)
language sql stable security definer set search_path to '' as $function$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select p.id, p.author_id,
         case when p.as_org is not null then coalesce((select o.name from core.organizations o where o.id = p.as_org), 'Organization') else public.k1_user_name(p.author_id) end,
         case when p.as_org is not null then (select s.logo from public.organization_settings s where s.organization_id = p.as_org) else public.k1_user_photo(p.author_id) end,
         p.body, p.media, p.link_url, p.link_kind, p.visibility, p.pinned, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         core.can((select id from r), 'community.listing.moderate'),
         p.reach, p.moderation_status, p.as_org,
         case when p.as_org is not null then (select o.name_hi from core.organizations o where o.id = p.as_org) end,
         p.tags,
         p.moderation->>'reason' = 'political',
         public.k1_shared_card(p.shared_post_id),
         public.k1_author_rel(p.author_id),
         null::jsonb,
         public.biz_card(p.business_id)
    from public.cm_posts p
   where p.organization_id = (select id from r) and p.status = 'active'
     and (p_post is null or p.id = p_post)
     and (p.business_id is null or p_post is not null)
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
     and (p.visibility <> 'friends' or p.author_id = auth.uid() or public.k1_is_friend(auth.uid(), p.author_id) or core.can((select id from r), 'community.listing.moderate'))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$function$;

create function public.k1_feed_search(p_org uuid, p_q text default null, p_tag text default null, p_before timestamptz default null, p_limit integer default 20)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb, business jsonb)
language sql stable security definer set search_path to '' as $function$
  select f.* from public.k1_feed(p_org, p_before, 400, null) f
   where (p_tag is null or lower(p_tag) = any(f.tags))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(f.body, '')) like '%' || lower(trim(p_q)) || '%' or lower(f.author_name) like '%' || lower(trim(p_q)) || '%')
   limit p_limit;
$function$;

create function public.k1_feed2(p_org uuid, p_mode text default 'for_you', p_offset integer default 0, p_limit integer default 15)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb, business jsonb)
language sql stable security definer set search_path to '' as $function$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  modr as (select core.can((select id from r), 'community.listing.moderate') ok),
  fr as (select case when f.user_a = auth.uid() then f.user_b else f.user_a end uid
           from public.cm_friendships f where f.status = 'accepted' and auth.uid() in (f.user_a, f.user_b)),
  fo as (select f.followee uid from public.cm_follows f where f.follower = auth.uid()),
  bf as (select f.page_id from public.biz_follows f where f.user_id = auth.uid()),
  mydist as (select lower(nullif(trim(u.district), '')) d from public.cm_user_profiles u where u.user_id = auth.uid()),
  base as (
    select p.*,
           case when p.business_id is not null then 'following'
                when p.author_id = auth.uid() then 'me'
                when p.author_id in (select uid from fr) then 'friend'
                when p.author_id in (select uid from fo) then 'following'
                else 'none' end rel
      from public.cm_posts p
     where p.organization_id = (select id from r) and p.status = 'active'
       and (p.business_id is null or p.business_id in (select page_id from bf))
       and (p.visibility = 'public' or public.k1_is_member((select id from r)))
       and (p.visibility <> 'friends' or p.author_id = auth.uid() or p.author_id in (select uid from fr) or (select ok from modr))
       and (p.reach = 'normal' or p.author_id = auth.uid() or (select ok from modr))
       and (p.pinned or p.created_at > now() - interval '30 days')
  ),
  scored as (
    select b.*, e.who, e.what,
           (case b.rel when 'friend' then 3.0 when 'me' then 2.0 when 'following' then 2.0
                       else case when e.who is not null then 1.5
                                 when (select d from mydist) is not null and (select lower(nullif(trim(u.district), '')) from public.cm_user_profiles u where u.user_id = b.author_id) = (select d from mydist) then 1.2
                                 else 1.0 end end)
           * (1 + ln(1 + b.like_count + 2 * b.comment_count + 3 * b.share_count))
           * power(0.5, extract(epoch from now() - b.created_at) / 86400.0)
           * (case when exists (select 1 from public.cm_post_seen s where s.user_id = auth.uid() and s.post_id = b.id and s.seen_at < now() - interval '30 minutes') then 0.35 else 1 end) score
      from base b
      left join lateral (
        select x.who, x.what from (
          select l.user_id who, 'like' what, l.created_at at from public.cm_post_likes l
           where l.post_id = b.id and l.user_id in (select uid from fr)
          union all
          select c.author_id, 'comment', c.created_at from public.cm_post_comments c
           where c.post_id = b.id and c.status = 'active' and c.author_id in (select uid from fr)
        ) x order by x.at desc limit 1
      ) e on b.rel not in ('me', 'friend')
     where coalesce(p_mode, 'for_you') = 'for_you' or b.rel in ('me', 'friend', 'following') or b.pinned
  )
  select s.id, s.author_id,
         case when s.as_org is not null then coalesce((select o.name from core.organizations o where o.id = s.as_org), 'Organization') else public.k1_user_name(s.author_id) end,
         case when s.as_org is not null then (select st.logo from public.organization_settings st where st.organization_id = s.as_org) else public.k1_user_photo(s.author_id) end,
         s.body, s.media, s.link_url, s.link_kind, s.visibility, s.pinned, s.like_count, s.comment_count, s.share_count, s.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = s.id and l.user_id = auth.uid()),
         s.author_id = auth.uid(),
         (select ok from modr),
         s.reach, s.moderation_status, s.as_org,
         case when s.as_org is not null then (select o.name_hi from core.organizations o where o.id = s.as_org) end,
         s.tags,
         s.moderation->>'reason' = 'political',
         public.k1_shared_card(s.shared_post_id),
         s.rel,
         case when s.who is not null then jsonb_build_object('kind', s.what, 'user_id', s.who, 'name', public.k1_user_name(s.who)) end,
         public.biz_card(s.business_id)
    from scored s
   order by s.pinned desc,
            case when coalesce(p_mode, 'for_you') = 'for_you' then s.score end desc nulls last,
            s.created_at desc, s.id
   offset greatest(coalesce(p_offset, 0), 0) limit least(coalesce(p_limit, 15), 50);
$function$;

-- the business tab / a page's posts: newest first, filters
create or replace function public.biz_feed(p_org uuid, p_page uuid default null, p_category text default null, p_city text default null, p_q text default null, p_offset integer default 0, p_limit integer default 15)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb, business jsonb)
language sql stable security definer set search_path to '' as $function$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  modr as (select core.can((select id from r), 'community.listing.moderate') ok)
  select p.id, p.author_id, public.k1_user_name(p.author_id), public.k1_user_photo(p.author_id),
         p.body, p.media, p.link_url, p.link_kind, p.visibility, p.pinned, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(), (select ok from modr), p.reach, p.moderation_status, null::uuid, null::text, p.tags,
         p.moderation->>'reason' = 'political', null::jsonb,
         case when exists (select 1 from public.biz_follows f where f.user_id = auth.uid() and f.page_id = p.business_id) then 'following' when p.author_id = auth.uid() then 'me' else 'none' end,
         null::jsonb, public.biz_card(p.business_id)
    from public.cm_posts p join public.biz_pages b on b.id = p.business_id
   where p.organization_id = (select id from r) and p.status = 'active' and b.status = 'active'
     and (p_page is null or p.business_id = p_page)
     and (p_category is null or b.category = p_category)
     and (p_city is null or lower(b.city) = lower(p_city) or lower(b.district) = lower(p_city))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(p.body, '') || ' ' || b.name) like '%' || lower(trim(p_q)) || '%')
     and (p.reach = 'normal' or p.author_id = auth.uid() or (select ok from modr))
   order by p.created_at desc
   offset greatest(coalesce(p_offset, 0), 0) limit least(coalesce(p_limit, 15), 50);
$function$;

-- grants ---------------------------------------------------------------------------------------------------------------
revoke all on function public.biz_tier(public.biz_pages), public.biz_daily_limit(text), public.biz_day_start(), public.biz_can_moderate(uuid), public.biz_card(uuid), public.biz_page_json(public.biz_pages),
  public.biz_page_save(uuid, jsonb), public.biz_page_get(text), public.biz_my_pages(), public.biz_directory(uuid, text, text, text, int, int), public.biz_facets(uuid),
  public.biz_follow(uuid, boolean), public.biz_block_page(uuid, boolean, text), public.biz_post_create(uuid, text, jsonb, text, text),
  public.k1_feed(uuid, timestamptz, integer, uuid), public.k1_feed_search(uuid, text, text, timestamptz, integer), public.k1_feed2(uuid, text, integer, integer),
  public.biz_feed(uuid, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.biz_page_save(uuid, jsonb), public.biz_my_pages(), public.biz_follow(uuid, boolean), public.biz_block_page(uuid, boolean, text), public.biz_post_create(uuid, text, jsonb, text, text) to authenticated;
grant execute on function public.biz_page_get(text), public.biz_directory(uuid, text, text, text, int, int), public.biz_facets(uuid),
  public.k1_feed(uuid, timestamptz, integer, uuid), public.k1_feed_search(uuid, text, text, timestamptz, integer), public.k1_feed2(uuid, text, integer, integer),
  public.biz_feed(uuid, uuid, text, text, text, integer, integer) to anon, authenticated;
