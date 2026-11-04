-- Kalchuri One · Phase 12b · community feed moderation: promotional / advertising content detection.
-- Every post is screened: (1) instantly by text heuristics in the database, (2) by the edge function cm-moderate
-- (AI reads the text and the images when a GEMINI_API_KEY is configured). Promotional posts get reach = 'limited'
-- (only the author and moderators see them), moderators get a WhatsApp alert, and decide: allow / keep limited / remove.
-- Paid sponsors go to the separate "Sponsored" board (k1_ad_board) with equal exposure.

alter table public.cm_posts
  add column if not exists reach text not null default 'normal' check (reach in ('normal','limited')),
  add column if not exists moderation_status text not null default 'pending' check (moderation_status in ('pending','clean','flagged','allowed')),
  add column if not exists moderation jsonb not null default '{}'::jsonb,   -- {heuristic:{score,hits[]}, ai:{promotional,confidence,category,reason,model}, decided_by, decided_at}
  add column if not exists moderated_at timestamptz;
create index if not exists cm_posts_moderation_idx on public.cm_posts(organization_id, moderation_status) where moderation_status in ('pending','flagged');

create or replace function public.k1_cm_default_keywords() returns text[] language sql immutable as $$ select array[
    'offer','discount','sale','buy now','order now','book now','call now','limited time','price','rate list','booking','dm for','contact for','whatsapp for','free delivery','cashback','emi','loan','earn money','work from home','join now','register now','vote for','support our candidate',
    'ऑफर','छूट','डिस्काउंट','बिक्री','खरीदें','खरीदे','ऑर्डर करें','बुकिंग','बुक करें','संपर्क करें','कॉल करें','कीमत','मूल्य','रेट','सस्ता','मुफ्त डिलीवरी','लोन','कमाएँ','कमाए','घर बैठे','वोट दें','प्रचार','विज्ञापन']; $$;

create table if not exists public.cm_settings (
  organization_id uuid primary key references core.organizations(id) on delete cascade,
  auto_limit boolean not null default true,          -- limit reach automatically when flagged
  threshold int not null default 3,                  -- heuristic score at which a post is flagged without AI
  ai_min_confidence numeric(3,2) not null default 0.60,
  keywords text[] not null default public.k1_cm_default_keywords(),
  notify_moderators boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.cm_settings enable row level security;
create policy cm_settings_rw on public.cm_settings for all to authenticated using (core.can(organization_id, 'community.listing.moderate')) with check (core.can(organization_id, 'community.listing.moderate'));
grant select, insert, update on public.cm_settings to authenticated;

-- ---------- heuristic text screen ----------
create or replace function public.k1_cm_promo_score(p_org uuid, p_text text, p_link text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare kw text[]; t text; score int := 0; hits text[] := '{}'; k text; n int;
begin
  select coalesce(s.keywords, '{}') into kw from public.cm_settings s where s.organization_id = p_org;
  if kw is null or kw = '{}' then kw := public.k1_cm_default_keywords(); end if;
  t := lower(coalesce(p_text, '') || ' ' || coalesce(p_link, ''));
  foreach k in array coalesce(kw, '{}') loop
    if position(lower(k) in t) > 0 then score := score + 1; hits := array_append(hits, k); end if;
  end loop;
  -- phone numbers in the text (not the author's own profile) → strong signal
  n := (select count(*) from regexp_matches(t, '(\+?91[\s-]?)?[6-9][0-9]{4}[\s-]?[0-9]{5}', 'g'));
  if n > 0 then score := score + 2; hits := array_append(hits, 'phone×' || n); end if;
  -- prices / percent-off
  if t ~ '(₹|rs\.?|rupees?|inr)\s*[0-9]' then score := score + 1; hits := array_append(hits, 'price'); end if;
  if t ~ '[0-9]{1,2}\s*%\s*(off|discount|छूट)' then score := score + 2; hits := array_append(hits, 'percent-off'); end if;
  -- commercial links (not the video/social hosts we embed)
  if p_link is not null and p_link !~* '(youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch)' then score := score + 1; hits := array_append(hits, 'external-link'); end if;
  if t ~ '(wa\.me/|bit\.ly/|amzn\.|flipkart\.|meesho\.|myntra\.)' then score := score + 2; hits := array_append(hits, 'shop-link'); end if;
  return jsonb_build_object('score', score, 'hits', to_jsonb(hits));
end $$;

-- screen on insert / content change: heuristic now, AI later
create or replace function public.trg_cm_post_screen() returns trigger language plpgsql security definer set search_path = '' as $$
declare h jsonb; thr int; auto boolean;
begin
  if tg_op = 'UPDATE' and new.body is not distinct from old.body and new.link_url is not distinct from old.link_url and new.media is not distinct from old.media then return new; end if;
  h := public.k1_cm_promo_score(new.organization_id, new.body, new.link_url);
  select coalesce(s.threshold, 3), coalesce(s.auto_limit, true) into thr, auto from public.cm_settings s where s.organization_id = new.organization_id;
  thr := coalesce(thr, 3); auto := coalesce(auto, true);
  new.moderation := jsonb_build_object('heuristic', h);
  new.moderation_status := 'pending';
  new.moderated_at := null;
  if (h->>'score')::int >= thr and auto then new.reach := 'limited'; new.moderation_status := 'flagged'; else new.reach := 'normal'; end if;
  return new;
end $$;
create trigger trg_cm_post_screen before insert or update of body, link_url, media on public.cm_posts for each row execute function public.trg_cm_post_screen();

-- ask the edge function to analyse (async, never blocks the insert)
create or replace function public.trg_cm_post_analyse() returns trigger language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/cm-moderate',
    body := jsonb_build_object('action', 'post', 'post_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 5000);
  return new;
exception when others then return new;
end $$;
create trigger trg_cm_post_analyse after insert on public.cm_posts for each row execute function public.trg_cm_post_analyse();

-- fallback sweep every 5 minutes: anything still pending after 2 minutes
create or replace function public.cm_moderate_tick()
returns void language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  if not exists (select 1 from public.cm_posts where moderation_status = 'pending' and created_at < now() - interval '2 minutes' and created_at > now() - interval '2 days') then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/cm-moderate',
    body := jsonb_build_object('action', 'scan'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 10000);
exception when others then null;
end $$;
select cron.schedule('kalchuri-cm-moderate', '*/5 * * * *', 'select public.cm_moderate_tick()');

-- ---------- service-role API for the edge function ----------
create or replace function public.k1_cm_pending_posts(p_limit int default 10)
returns table (id uuid, organization_id uuid, body text, link_url text, media jsonb, moderation jsonb)
language sql stable security definer set search_path = '' as $$
  select p.id, p.organization_id, p.body, p.link_url, p.media, p.moderation from public.cm_posts p
   where p.moderation_status = 'pending' and p.status = 'active' and p.created_at > now() - interval '2 days'
   order by p.created_at limit p_limit;
$$;

-- WhatsApp alert to everyone who can moderate the community (+ the organization's WhatsApp number)
create or replace function public.k1_cm_notify_moderators(p_org uuid, p_body text, p_ref uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare ch uuid; n int := 0; r record;
begin
  ch := public.k1_pick_channel(p_org, 'whatsapp');
  if ch is null then return 0; end if;
  for r in
    select distinct public.k1_norm_contact(x.phone) phone, x.name
      from (
        select coalesce(sp.mobile, pr.phone) phone, coalesce(sp.full_name, pr.full_name) name
          from core.role_assignments ra join core.roles ro on ro.id = ra.role_id
          left join public.site_profiles sp on sp.id = ra.user_id left join public.profiles pr on pr.id = ra.user_id
         where ra.organization_id = p_org and (ra.valid_to is null or ra.valid_to >= current_date)
           and ro.permissions && array['*', 'community.*', 'community.listing.moderate']
        union all
        select os.whatsapp, os.organization_name from public.organization_settings os where os.organization_id = p_org
      ) x where x.phone is not null and x.phone <> ''
  loop
    if r.phone ~ '^[0-9]{11,13}$' then
      insert into public.comms_messages(organization_id, channel_id, kind, purpose, to_contact, to_name, body, ref_table, ref_id)
      values (p_org, ch, 'whatsapp', 'utility', r.phone, r.name, p_body, 'cm_posts', p_ref);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- the edge function reports its verdict here
create or replace function public.k1_cm_moderation_result(p_post uuid, p_ai jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts; s public.cm_settings; flagged boolean; hscore int; conf numeric; author text; msg text;
begin
  select * into p from public.cm_posts where id = p_post; if p is null then return; end if;
  select * into s from public.cm_settings where organization_id = p.organization_id;
  hscore := coalesce((p.moderation->'heuristic'->>'score')::int, 0);
  conf := coalesce((p_ai->>'confidence')::numeric, 0);
  flagged := hscore >= coalesce(s.threshold, 3)
          or (coalesce((p_ai->>'promotional')::boolean, false) and conf >= coalesce(s.ai_min_confidence, 0.60));
  update public.cm_posts
     set moderation = p.moderation || jsonb_build_object('ai', p_ai),
         moderation_status = case when flagged then 'flagged' else 'clean' end,
         reach = case when flagged and coalesce(s.auto_limit, true) then 'limited' else 'normal' end,
         moderated_at = now()
   where id = p_post;
  if flagged and p.moderated_at is null and coalesce(s.notify_moderators, true) then
    select coalesce((select m.full_name from public.org_memberships m where m.user_id = p.author_id and m.organization_id = p.organization_id limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p.author_id), 'Member') into author;
    msg := '⚠️ Kalchuri One: प्रचार/विज्ञापन जैसी पोस्ट मिली — पहुँच सीमित कर दी गई है।' || E'\n'
        || 'किसने: ' || author || E'\n'
        || 'कारण: ' || coalesce(p_ai->>'reason', 'keywords: ' || coalesce(p.moderation->'heuristic'->>'hits', '')) || E'\n'
        || coalesce('पाठ: ' || left(p.body, 160) || E'\n', '')
        || 'समीक्षा: ' || coalesce((select 'https://' || d.hostname || '/admin/community' from core.org_domains d where d.organization_id = p.organization_id and d.verified_at is not null order by d.is_primary desc limit 1), 'Admin → Community → Kalchuri One feed');
    perform public.k1_cm_notify_moderators(p.organization_id, msg, p.id);
  end if;
end $$;
revoke all on function public.k1_cm_pending_posts(int), public.k1_cm_moderation_result(uuid, jsonb), public.k1_cm_notify_moderators(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.k1_cm_pending_posts(int), public.k1_cm_moderation_result(uuid, jsonb), public.k1_cm_notify_moderators(uuid, text, uuid) to service_role;
grant execute on function public.k1_cm_promo_score(uuid, text, text) to authenticated;

-- ---------- moderator review ----------
create or replace function public.k1_cm_review(p_post uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_posts where id = p_post;
  if org is null or not core.can(org, 'community.listing.moderate') then raise exception 'Not allowed'; end if;
  if p_action = 'allow' then
    update public.cm_posts set moderation_status = 'allowed', reach = 'normal', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
  elsif p_action = 'limit' then
    update public.cm_posts set moderation_status = 'flagged', reach = 'limited', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
  elsif p_action = 'remove' then
    update public.cm_posts set status = 'removed', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
  else raise exception 'Unknown action'; end if;
end $$;
grant execute on function public.k1_cm_review(uuid, text) to authenticated;

create or replace function public.k1_cm_flagged(p_org uuid)
returns table (id uuid, author_name text, body text, link_url text, media jsonb, moderation jsonb, moderation_status text, reach text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id,
         coalesce((select m.full_name from public.org_memberships m where m.user_id = p.author_id and m.organization_id = p_org limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p.author_id), 'Member'),
         p.body, p.link_url, p.media, p.moderation, p.moderation_status, p.reach, p.created_at
    from public.cm_posts p
   where p.organization_id = p_org and p.status = 'active' and (p.reach = 'limited' or p.moderation_status = 'flagged')
     and core.can(p_org, 'community.listing.moderate')
   order by p.created_at desc limit 200;
$$;
grant execute on function public.k1_cm_flagged(uuid) to authenticated;

-- ---------- reach enforcement: limited posts are visible only to the author and moderators ----------
drop policy if exists cm_posts_public_read on public.cm_posts;
create policy cm_posts_public_read on public.cm_posts for select using (status = 'active' and visibility = 'public' and reach = 'normal');
drop policy if exists cm_posts_member_read on public.cm_posts;
create policy cm_posts_member_read on public.cm_posts for select to authenticated using (status = 'active' and public.k1_is_member(organization_id) and (reach = 'normal' or author_id = auth.uid()));

drop function if exists public.k1_feed(uuid, timestamptz, int, uuid);
create or replace function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit int default 20, p_post uuid default null)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.author_id,
         coalesce((select m.full_name from public.org_memberships m where m.user_id = p.author_id and m.organization_id = p_org limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p.author_id), 'Member'),
         (select sp.photo_url from public.site_profiles sp where sp.id = p.author_id),
         p.body, p.media, p.link_url, p.link_kind, p.visibility, p.pinned, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         core.can(p_org, 'community.listing.moderate'),
         p.reach, p.moderation_status
    from public.cm_posts p
   where p.organization_id = p_org and p.status = 'active'
     and (p.visibility = 'public' or public.k1_is_member(p_org))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can(p_org, 'community.listing.moderate'))
     and (p_post is null or p.id = p_post)
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;
grant execute on function public.k1_feed(uuid, timestamptz, int, uuid) to anon, authenticated;

-- ---------- sponsored board: every active paid campaign, fair order (fewest impressions per weight first) ----------
create or replace function public.k1_ad_board(p_org uuid)
returns table (id uuid, title text, sponsor text, image text, text_en text, text_hi text, link text, ends_on date)
language sql stable security definer set search_path = '' as $$
  select c.id, c.title, c.sponsor_name, c.creative_image, c.creative_text, c.creative_text_hi, c.link_url, c.ends_on
    from public.ad_campaigns c
   where c.organization_id = p_org and c.status = 'active' and c.starts_on <= current_date and (c.ends_on is null or c.ends_on >= current_date)
   order by (c.impressions::numeric / greatest(c.weight, 1)) asc, c.starts_on desc;
$$;
grant execute on function public.k1_ad_board(uuid) to anon, authenticated;

-- existing posts: screened as clean (no retro-flagging)
update public.cm_posts set moderation_status = 'clean', moderated_at = now() where moderation_status = 'pending';
