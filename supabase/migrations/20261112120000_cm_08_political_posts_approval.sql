-- Kalchuri One community (owner, 2026-11-12): political posts get limited reach at once and go to the admins for approval.
-- The AI screen already classes "political" as promotional when GEMINI_API_KEY is set; this adds an instant keyword screen
-- (Hindi + English: parties, elections, candidates, slogans) so it works without AI, marks the reason, and raises an
-- in-app admin notification (bell + email/WhatsApp through the notification engine). Admin approves/keeps-limited in
-- Admin → Community (k1_cm_review). Additive only.

create or replace function public.k1_cm_political_keywords() returns text[] language sql immutable as $$ select array[
  'भाजपा','बीजेपी','कांग्रेस','आम आदमी पार्टी','आप पार्टी','सपा','बसपा','समाजवादी पार्टी','बहुजन समाज','जनता दल','जदयू','राजद','तृणमूल','शिवसेना','एनसीपी','जोगी कांग्रेस','गोंडवाना','छत्तीसगढ़ क्रांति सेना',
  'bjp','congress','aap ','aam aadmi','samajwadi','bsp ','jdu','rjd','tmc','shiv sena','ncp',
  'चुनाव','मतदान','वोट','वोट दें','वोट करें','प्रत्याशी','उम्मीदवार','टिकट','प्रचार','रैली','जनसभा','घोषणापत्र','विधानसभा चुनाव','लोकसभा चुनाव','पंचायत चुनाव','नगर निगम चुनाव','चुनाव चिन्ह','कमल','पंजा','झाड़ू','हाथी','साइकिल',
  'election','vote for','voting','candidate','campaign','manifesto','rally','mla ','mp ','ticket',
  'मोदी','राहुल गांधी','केजरीवाल','भूपेश','विष्णुदेव','साय सरकार','बघेल','योगी','अखिलेश','मायावती','ममता',
  'सरकार मुर्दाबाद','ज़िंदाबाद','जिंदाबाद','भ्रष्ट सरकार','तानाशाह','आरक्षण विरोध','दल बदल'
]$$;

create or replace function public.k1_cm_political_score(p_text text)
returns jsonb language plpgsql immutable as $$
declare t text; k text; score int := 0; hits text[] := '{}';
begin
  t := ' ' || lower(coalesce(p_text, '')) || ' ';
  foreach k in array public.k1_cm_political_keywords() loop
    if position(lower(k) in t) > 0 then score := score + case when length(k) >= 6 or k ~ '[ऀ-ॿ]' then 2 else 1 end; hits := array_append(hits, btrim(k)); end if;
  end loop;
  return jsonb_build_object('score', score, 'hits', to_jsonb(hits));
end $$;

alter table public.cm_settings add column if not exists political_hold boolean not null default true;   -- hold political posts for approval

-- screen on insert / content change: promo heuristic (as before) + political keywords
create or replace function public.trg_cm_post_screen() returns trigger language plpgsql security definer set search_path = '' as $$
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
  if new.as_org is not null and core.is_org_team(new.as_org) then
    new.reach := 'normal';   -- the organization's own posts are not held
  elsif (pol->>'score')::int >= 2 and hold then
    new.reach := 'limited'; new.moderation_status := 'flagged';
    new.moderation := new.moderation || jsonb_build_object('reason', 'political', 'reason_hi', 'राजनीतिक विषय — एडमिन की मंज़ूरी के बाद सबको दिखेगी');
  elsif (h->>'score')::int >= thr and auto then
    new.reach := 'limited'; new.moderation_status := 'flagged';
  else
    new.reach := 'normal';
  end if;
  return new;
end $$;

-- the AI result must not un-flag a political hold
create or replace function public.k1_cm_moderation_result(p_post uuid, p_ai jsonb)
returns void language plpgsql security definer set search_path = '' as $$
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
end $$;

-- instant admin alert (bell + email/WhatsApp) when a political post is held — does not wait for the AI pass
create or replace function public.trg_cm_post_political_alert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.moderation->>'reason' = 'political' and new.reach = 'limited' then
    begin
      perform public.k1_admin_notify(new.organization_id, 'community.listing.moderate', 'post_hold',
        '🗳️ राजनीतिक पोस्ट मंज़ूरी के लिए रुकी है',
        public.k1_user_name(new.author_id) || ': ' || left(coalesce(new.body, '(फोटो)'), 200) || E'\n' || 'मिले शब्द: ' || coalesce(new.moderation->'political'->>'hits', ''),
        '/admin/community', 'cm_posts', new.id, true);
      update public.cm_posts set moderation = moderation || jsonb_build_object('notified', true) where id = new.id;
    exception when others then null; end;
  end if;
  return new;
end $$;
drop trigger if exists trg_cm_post_political_alert on public.cm_posts;
create trigger trg_cm_post_political_alert after insert on public.cm_posts for each row execute function public.trg_cm_post_political_alert();

-- author notification on decision (allow → "अब सबको दिखेगी")
create or replace function public.k1_cm_review(p_post uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts;
begin
  select * into p from public.cm_posts where id = p_post; if p is null then raise exception 'not found'; end if;
  if not core.can(p.organization_id, 'community.listing.moderate') then raise exception 'not allowed'; end if;
  if p_action = 'allow' then
    update public.cm_posts set moderation_status = 'allowed', reach = 'normal', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
    begin insert into public.cm_notifications (organization_id, user_id, kind, actor_id, post_id, text) values (p.organization_id, p.author_id, 'moderation', auth.uid(), p.id, 'आपकी पोस्ट मंज़ूर हो गई — अब सबको दिख रही है।'); exception when others then null; end;
  elsif p_action = 'limit' then
    update public.cm_posts set moderation_status = 'flagged', reach = 'limited', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
    begin insert into public.cm_notifications (organization_id, user_id, kind, actor_id, post_id, text) values (p.organization_id, p.author_id, 'moderation', auth.uid(), p.id, 'आपकी पोस्ट की पहुँच सीमित रखी गई है (समाज के नियमों के अनुसार राजनीतिक/प्रचार सामग्री सबको नहीं दिखाई जाती)।'); exception when others then null; end;
  elsif p_action = 'remove' then
    update public.cm_posts set status = 'removed', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
  else raise exception 'Unknown action'; end if;
end $$;
grant execute on function public.k1_cm_review(uuid, text) to authenticated;

-- feed rows say why a post is limited (political) so the app can explain it
drop function if exists public.k1_feed_search(uuid, text, text, timestamptz, int);
drop function if exists public.k1_feed(uuid, timestamptz, int, uuid);
create or replace function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit int default 20, p_post uuid default null)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean)
language sql stable security definer set search_path = '' as $$
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
         p.moderation->>'reason' = 'political'
    from public.cm_posts p
   where p.organization_id = (select id from r) and p.status = 'active'
     and (p_post is null or p.id = p_post)
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;
grant execute on function public.k1_feed(uuid, timestamptz, int, uuid) to anon, authenticated;
create or replace function public.k1_feed_search(p_org uuid, p_q text default null, p_tag text default null, p_before timestamptz default null, p_limit int default 20)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean)
language sql stable security definer set search_path = '' as $$
  select f.* from public.k1_feed(p_org, p_before, 400, null) f
   where (p_tag is null or lower(p_tag) = any(f.tags))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(f.body, '')) like '%' || lower(trim(p_q)) || '%' or lower(f.author_name) like '%' || lower(trim(p_q)) || '%')
   limit p_limit;
$$;
grant execute on function public.k1_feed_search(uuid, text, text, timestamptz, int) to anon, authenticated;
