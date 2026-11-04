-- Kalchuri One · Phase 14 · feed polish: in-app notifications, hashtags + search, comment screening, author appeal.

-- ---------- notifications ----------
create table public.cm_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like','comment','reply','moderation','appeal')),
  actor_id uuid references auth.users(id) on delete set null,
  post_id uuid references public.cm_posts(id) on delete cascade,
  comment_id uuid references public.cm_post_comments(id) on delete cascade,
  text text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.cm_notifications(user_id, read_at, created_at desc);
alter table public.cm_notifications enable row level security;
create policy cm_notif_own on public.cm_notifications for select to authenticated using (user_id = auth.uid());
create policy cm_notif_mark on public.cm_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update on public.cm_notifications to authenticated;

create or replace function public.k1_cm_notify(p_user uuid, p_org uuid, p_kind text, p_actor uuid, p_post uuid, p_comment uuid, p_text text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  -- collapse repeated likes on the same post into one unread row
  if p_kind = 'like' and exists (select 1 from public.cm_notifications where user_id = p_user and kind = 'like' and post_id = p_post and read_at is null) then
    update public.cm_notifications set created_at = now(), actor_id = p_actor, text = p_text where user_id = p_user and kind = 'like' and post_id = p_post and read_at is null; return;
  end if;
  insert into public.cm_notifications(organization_id, user_id, kind, actor_id, post_id, comment_id, text) values (p_org, p_user, p_kind, p_actor, p_post, p_comment, p_text);
end $$;
revoke execute on function public.k1_cm_notify(uuid, uuid, text, uuid, uuid, uuid, text) from public, anon, authenticated;

create or replace function public.k1_cm_actor_name(p_user uuid, p_org uuid) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select m.full_name from public.org_memberships m where m.user_id = p_user and m.organization_id = p_org limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p_user), 'Member');
$$;
revoke execute on function public.k1_cm_actor_name(uuid, uuid) from public, anon, authenticated;

create or replace function public.trg_cm_notify_like() returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts; n int;
begin
  select * into p from public.cm_posts where id = new.post_id;
  n := p.like_count;  -- trg_cm_like_count (alphabetically earlier) has already incremented
  perform public.k1_cm_notify(p.author_id, p.organization_id, 'like', new.user_id, p.id, null,
    public.k1_cm_actor_name(new.user_id, p.organization_id) || case when n > 1 then ' और ' || (n - 1) || ' अन्य ने' else ' ने' end || ' आपकी पोस्ट पसंद की');
  return new;
end $$;
create trigger trg_cm_notify_like after insert on public.cm_post_likes for each row execute function public.trg_cm_notify_like();

create or replace function public.trg_cm_notify_comment() returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts; parent_author uuid; who text;
begin
  select * into p from public.cm_posts where id = new.post_id;
  who := public.k1_cm_actor_name(new.author_id, p.organization_id);
  if new.parent_id is not null then
    select author_id into parent_author from public.cm_post_comments where id = new.parent_id;
    perform public.k1_cm_notify(parent_author, p.organization_id, 'reply', new.author_id, p.id, new.id, who || ' ने आपकी टिप्पणी का जवाब दिया: ' || left(new.body, 80));
    if parent_author <> p.author_id then perform public.k1_cm_notify(p.author_id, p.organization_id, 'comment', new.author_id, p.id, new.id, who || ' ने टिप्पणी की: ' || left(new.body, 80)); end if;
  else
    perform public.k1_cm_notify(p.author_id, p.organization_id, 'comment', new.author_id, p.id, new.id, who || ' ने आपकी पोस्ट पर टिप्पणी की: ' || left(new.body, 80));
  end if;
  return new;
end $$;
create trigger trg_cm_notify_comment after insert on public.cm_post_comments for each row execute function public.trg_cm_notify_comment();

-- moderation decisions notify the author (hooked into k1_cm_review)
create or replace function public.k1_cm_review(p_post uuid, p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts;
begin
  select * into p from public.cm_posts where id = p_post;
  if p is null or not core.can(p.organization_id, 'community.listing.moderate') then raise exception 'Not allowed'; end if;
  if p_action = 'allow' then
    update public.cm_posts set moderation_status = 'allowed', reach = 'normal', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
    perform public.k1_cm_notify(p.author_id, p.organization_id, 'moderation', auth.uid(), p.id, null, 'आपकी पोस्ट की समीक्षा हुई — अब सबको दिख रही है ✅');
  elsif p_action = 'limit' then
    update public.cm_posts set moderation_status = 'flagged', reach = 'limited', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
    perform public.k1_cm_notify(p.author_id, p.organization_id, 'moderation', auth.uid(), p.id, null, 'आपकी पोस्ट की पहुँच सीमित रखी गई है (प्रचार/विज्ञापन नियम)');
  elsif p_action = 'remove' then
    update public.cm_posts set status = 'removed', moderation = moderation || jsonb_build_object('decided_by', auth.uid(), 'decided_at', now()) where id = p_post;
    perform public.k1_cm_notify(p.author_id, p.organization_id, 'moderation', auth.uid(), null, null, 'आपकी एक पोस्ट समुदाय नियमों के कारण हटाई गई');
  else raise exception 'Unknown action'; end if;
end $$;

-- author appeal on a limited post → moderators get a WhatsApp + the post is marked
create or replace function public.k1_cm_appeal(p_post uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare p public.cm_posts;
begin
  select * into p from public.cm_posts where id = p_post and author_id = auth.uid() and reach = 'limited';
  if p is null then raise exception 'Not your limited post'; end if;
  if p.moderation ? 'appeal' then raise exception 'Appeal already sent'; end if;
  update public.cm_posts set moderation = moderation || jsonb_build_object('appeal', jsonb_build_object('at', now(), 'note', left(coalesce(p_note, ''), 300))) where id = p_post;
  perform public.k1_cm_notify_moderators(p.organization_id,
    '🙋 Kalchuri One: ' || public.k1_cm_actor_name(auth.uid(), p.organization_id) || ' ने सीमित पोस्ट की समीक्षा माँगी है।' || E'\n' || coalesce('कारण: ' || left(p_note, 200) || E'\n', '') || coalesce('पाठ: ' || left(p.body, 120) || E'\n', '') || 'Admin → Community → Kalchuri One feed', p.id);
end $$;
grant execute on function public.k1_cm_appeal(uuid, text) to authenticated;

create or replace function public.k1_cm_notifications(p_limit int default 30)
returns table (id uuid, kind text, text text, post_id uuid, comment_id uuid, read_at timestamptz, created_at timestamptz, unread int)
language sql stable security definer set search_path = '' as $$
  select n.id, n.kind, n.text, n.post_id, n.comment_id, n.read_at, n.created_at,
         (select count(*)::int from public.cm_notifications u where u.user_id = auth.uid() and u.read_at is null)
    from public.cm_notifications n where n.user_id = auth.uid() order by n.created_at desc limit p_limit;
$$;
grant execute on function public.k1_cm_notifications(int) to authenticated;
create or replace function public.k1_cm_notifications_read(p_ids uuid[] default null)
returns void language sql security definer set search_path = '' as $$
  update public.cm_notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
$$;
grant execute on function public.k1_cm_notifications_read(uuid[]) to authenticated;

-- ---------- hashtags + search ----------
alter table public.cm_posts add column if not exists tags text[] not null default '{}';
create index if not exists cm_posts_tags_idx on public.cm_posts using gin(tags);
create extension if not exists pg_trgm with schema extensions;
create index if not exists cm_posts_body_trgm_idx on public.cm_posts using gin (lower(coalesce(body, '')) extensions.gin_trgm_ops);
create or replace function public.trg_cm_post_tags() returns trigger language plpgsql set search_path = '' as $$
begin
  new.tags := coalesce((select array_agg(distinct lower(m[1])) from regexp_matches(coalesce(new.body, ''), '#([^\s#@.,!?()\[\]{}"''|<>]{2,40})', 'g') m), '{}');
  return new;
end $$;
create trigger trg_cm_post_tags before insert or update of body on public.cm_posts for each row execute function public.trg_cm_post_tags();
update public.cm_posts set tags = coalesce((select array_agg(distinct lower(m[1])) from regexp_matches(coalesce(body, ''), '#([^\s#@.,!?()\[\]{}"''|<>]{2,40})', 'g') m), '{}') where body like '%#%';

create or replace function public.k1_feed_search(p_org uuid, p_q text default null, p_tag text default null, p_before timestamptz default null, p_limit int default 20)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text)
language sql stable security definer set search_path = '' as $$
  select f.* from public.k1_feed(p_org, p_before, 400, null) f join public.cm_posts p on p.id = f.id
   where (p_tag is null or lower(p_tag) = any(p.tags))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(f.body, '')) like '%' || lower(trim(p_q)) || '%' or lower(f.author_name) like '%' || lower(trim(p_q)) || '%')
   limit p_limit;
$$;
grant execute on function public.k1_feed_search(uuid, text, text, timestamptz, int) to anon, authenticated;

-- trending tags (last 30 days)
create or replace function public.k1_cm_tags(p_org uuid, p_limit int default 20)
returns table (tag text, n bigint) language sql stable security definer set search_path = '' as $$
  select t, count(*) from public.cm_posts p, unnest(p.tags) t
   where p.organization_id = p_org and p.status = 'active' and p.reach = 'normal' and p.created_at > now() - interval '30 days'
     and (p.visibility = 'public' or public.k1_is_member(p_org))
   group by t order by 2 desc, 1 limit p_limit;
$$;
grant execute on function public.k1_cm_tags(uuid, int) to anon, authenticated;

-- ---------- comments: promotional text is hidden for moderator review ----------
create or replace function public.trg_cm_comment_screen() returns trigger language plpgsql security definer set search_path = '' as $$
declare h jsonb; thr int;
begin
  h := public.k1_cm_promo_score(new.organization_id, new.body, null);
  select coalesce(s.threshold, 3) into thr from public.cm_settings s where s.organization_id = new.organization_id;
  if (h->>'score')::int >= coalesce(thr, 3) then new.status := 'hidden'; end if;
  return new;
end $$;
create trigger trg_cm_comment_screen before insert on public.cm_post_comments for each row execute function public.trg_cm_comment_screen();
create or replace function public.trg_cm_comment_report() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'hidden' then
    insert into public.cm_post_reports(post_id, comment_id, organization_id, reporter_id, reason)
    values (new.post_id, new.id, new.organization_id, new.author_id, 'auto: promotional comment hidden — ' || left(new.body, 150));
  end if;
  return new;
end $$;
create trigger trg_cm_comment_report after insert on public.cm_post_comments for each row execute function public.trg_cm_comment_report();
