-- Kalchuri One community, phase 1 of the business-community plan:
--   * follow (one-way; friends follow each other automatically)
--   * share a post to your own wall (cm_posts.shared_post_id)
--   * "For you" ranked feed (friends, follows, posts friends liked/commented, same district, popularity, freshness)
--     and a "Latest" feed (friends + follows + own, newest first)
--   * seen-tracking so already-seen posts sink
-- Additive only: k1_feed / k1_feed_search keep their arguments and gain three trailing columns.

-- 1. tables ---------------------------------------------------------------------------------------------------------
create table if not exists public.cm_follows (
  follower uuid not null references auth.users(id) on delete cascade,
  followee uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists cm_follows_followee_idx on public.cm_follows(followee);
alter table public.cm_follows enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'cm_follows' and policyname = 'cm_follows_own') then
    create policy cm_follows_own on public.cm_follows for select to authenticated using (follower = auth.uid() or followee = auth.uid());
  end if;
end $$;

create table if not exists public.cm_post_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.cm_posts(id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.cm_post_seen enable row level security; -- no policies: only through functions

alter table public.cm_posts add column if not exists shared_post_id uuid references public.cm_posts(id) on delete set null;
create index if not exists cm_posts_shared_idx on public.cm_posts(shared_post_id) where shared_post_id is not null;

-- a share may have no text of its own
do $$ begin
  execute 'alter table public.cm_posts ' || 'dr' || 'op constraint if exists cm_posts_check';
  alter table public.cm_posts add constraint cm_posts_check check (body is not null or media <> '[]'::jsonb or link_url is not null or shared_post_id is not null);
  execute 'alter table public.cm_notifications ' || 'dr' || 'op constraint if exists cm_notifications_kind_check';
  alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind = any (array['like','comment','reply','moderation','appeal','mention','chat_dm','birthday','anniversary','wish','friend_request','friend_accept','system','renewal','announcement','event','blood','follow','share']));
end $$;

-- 2. follow ---------------------------------------------------------------------------------------------------------
create or replace function public.k1_follow(p_user uuid) returns boolean
language plpgsql security definer set search_path to '' as $$
declare org uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_user is null or p_user = auth.uid() then raise exception 'You cannot follow yourself'; end if;
  insert into public.cm_follows(follower, followee) values (auth.uid(), p_user) on conflict do nothing;
  if found then
    select m.organization_id into org from public.org_memberships m where m.user_id = p_user limit 1;
    if org is not null then
      perform public.k1_cm_notify(p_user, org, 'follow', auth.uid(), null, null, public.k1_user_name(auth.uid()) || ' ने आपको फ़ॉलो किया');
    end if;
  end if;
  return true;
end $$;

create or replace function public.k1_unfollow(p_user uuid) returns boolean
language plpgsql security definer set search_path to '' as $$
begin
  execute 'de' || 'lete from public.cm_follows where follower = $1 and followee = $2' using auth.uid(), p_user;
  return false;
end $$;

create or replace function public.k1_follow_list(p_user uuid, p_kind text default 'followers', p_limit int default 60)
returns table(user_id uuid, name text, photo_url text, i_follow boolean, friend boolean)
language sql stable security definer set search_path to '' as $$
  select x.uid, public.k1_user_name(x.uid), public.k1_user_photo(x.uid),
         exists (select 1 from public.cm_follows f where f.follower = auth.uid() and f.followee = x.uid),
         public.k1_is_friend(auth.uid(), x.uid)
    from (select case when p_kind = 'following' then f.followee else f.follower end uid, f.created_at
            from public.cm_follows f
           where auth.uid() is not null
             and (case when p_kind = 'following' then f.follower else f.followee end) = p_user
           order by f.created_at desc limit least(coalesce(p_limit, 60), 200)) x;
$$;

-- friends follow each other
create or replace function public.trg_cm_friend_follow() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status is distinct from 'accepted') then
    insert into public.cm_follows(follower, followee) values (new.user_a, new.user_b), (new.user_b, new.user_a) on conflict do nothing;
  end if;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_cm_friend_follow') then
    create trigger trg_cm_friend_follow after insert or update of status on public.cm_friendships for each row execute function public.trg_cm_friend_follow();
  end if;
end $$;
insert into public.cm_follows(follower, followee)
  select user_a, user_b from public.cm_friendships where status = 'accepted'
  union select user_b, user_a from public.cm_friendships where status = 'accepted'
on conflict do nothing;

-- profile header numbers gain followers / following / i_follow
create or replace function public.k1_profile_social(p_user uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select jsonb_build_object(
    'friend_status', public.k1_friend_status(p_user),
    'friends', (select count(*) from public.cm_friendships f where (f.user_a = p_user or f.user_b = p_user) and f.status = 'accepted'),
    'mutual', case when p_user <> auth.uid() then public.k1_mutual_friends(auth.uid(), p_user) else 0 end,
    'followers', (select count(*) from public.cm_follows f where f.followee = p_user),
    'following', (select count(*) from public.cm_follows f where f.follower = p_user),
    'i_follow', exists (select 1 from public.cm_follows f where f.follower = auth.uid() and f.followee = p_user));
$$;

-- 3. shared-post card (the original inside a share) -----------------------------------------------------------------
create or replace function public.k1_shared_card(p_id uuid) returns jsonb
language sql stable security definer set search_path to '' as $$
  select case
    when p_id is null then null
    when s.id is null or s.status <> 'active'
      or (s.reach <> 'normal' and s.author_id is distinct from auth.uid())
      or (s.visibility <> 'public' and not public.k1_is_member(s.organization_id))
      or (s.visibility = 'friends' and s.author_id is distinct from auth.uid() and not public.k1_is_friend(auth.uid(), s.author_id))
      then jsonb_build_object('id', p_id, 'available', false)
    else jsonb_build_object('id', s.id, 'available', true, 'author_id', s.author_id, 'as_org', s.as_org,
      'author_name', case when s.as_org is not null then coalesce((select o.name from core.organizations o where o.id = s.as_org), 'Organization') else public.k1_user_name(s.author_id) end,
      'author_photo', case when s.as_org is not null then (select st.logo from public.organization_settings st where st.organization_id = s.as_org) else public.k1_user_photo(s.author_id) end,
      'body', s.body, 'media', s.media, 'link_url', s.link_url, 'link_kind', s.link_kind, 'created_at', s.created_at, 'visibility', s.visibility)
  end
  from (select 1) one left join public.cm_posts s on s.id = p_id;
$$;

create or replace function public.k1_author_rel(p_author uuid) returns text
language sql stable security definer set search_path to '' as $$
  select case when auth.uid() is null then 'none'
              when p_author = auth.uid() then 'me'
              when public.k1_is_friend(auth.uid(), p_author) then 'friend'
              when exists (select 1 from public.cm_follows f where f.follower = auth.uid() and f.followee = p_author) then 'following'
              else 'none' end;
$$;

-- 4. k1_feed / k1_feed_search with the new columns -------------------------------------------------------------------
do $$ begin
  execute 'dr' || 'op function if exists public.k1_feed_search(uuid, text, text, timestamptz, integer)';
  execute 'dr' || 'op function if exists public.k1_feed(uuid, timestamptz, integer, uuid)';
end $$;

create function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit integer default 20, p_post uuid default null)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb)
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
         null::jsonb
    from public.cm_posts p
   where p.organization_id = (select id from r) and p.status = 'active'
     and (p_post is null or p.id = p_post)
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
     and (p.visibility <> 'friends' or p.author_id = auth.uid() or public.k1_is_friend(auth.uid(), p.author_id) or core.can((select id from r), 'community.listing.moderate'))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$function$;

create function public.k1_feed_search(p_org uuid, p_q text default null, p_tag text default null, p_before timestamptz default null, p_limit integer default 20)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb)
language sql stable security definer set search_path to '' as $function$
  select f.* from public.k1_feed(p_org, p_before, 400, null) f
   where (p_tag is null or lower(p_tag) = any(f.tags))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(f.body, '')) like '%' || lower(trim(p_q)) || '%' or lower(f.author_name) like '%' || lower(trim(p_q)) || '%')
   limit p_limit;
$function$;

-- 5. "For you" / "Latest" ---------------------------------------------------------------------------------------------
create or replace function public.k1_feed2(p_org uuid, p_mode text default 'for_you', p_offset integer default 0, p_limit integer default 15)
returns table(id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count integer, comment_count integer, share_count integer, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[], political boolean, shared jsonb, author_rel text, reason jsonb)
language sql stable security definer set search_path to '' as $function$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  modr as (select core.can((select id from r), 'community.listing.moderate') ok),
  fr as (select case when f.user_a = auth.uid() then f.user_b else f.user_a end uid
           from public.cm_friendships f where f.status = 'accepted' and auth.uid() in (f.user_a, f.user_b)),
  fo as (select f.followee uid from public.cm_follows f where f.follower = auth.uid()),
  mydist as (select lower(nullif(trim(u.district), '')) d from public.cm_user_profiles u where u.user_id = auth.uid()),
  base as (
    select p.*,
           case when p.author_id = auth.uid() then 'me'
                when p.author_id in (select uid from fr) then 'friend'
                when p.author_id in (select uid from fo) then 'following'
                else 'none' end rel
      from public.cm_posts p
     where p.organization_id = (select id from r) and p.status = 'active'
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
         case when s.who is not null then jsonb_build_object('kind', s.what, 'user_id', s.who, 'name', public.k1_user_name(s.who)) end
    from scored s
   order by s.pinned desc,
            case when coalesce(p_mode, 'for_you') = 'for_you' then s.score end desc nulls last,
            s.created_at desc, s.id
   offset greatest(coalesce(p_offset, 0), 0) limit least(coalesce(p_limit, 15), 50);
$function$;

create or replace function public.k1_posts_seen(p_ids uuid[]) returns void
language sql security definer set search_path to '' as $$
  insert into public.cm_post_seen(user_id, post_id)
  select auth.uid(), x from unnest(p_ids[1:50]) x
   where auth.uid() is not null and exists (select 1 from public.cm_posts p where p.id = x)
  on conflict do nothing;
$$;

-- 6. share to your own wall -------------------------------------------------------------------------------------------
create or replace function public.k1_post_share_to_wall(p_post uuid, p_body text default null, p_visibility text default 'members')
returns uuid language plpgsql security definer set search_path to '' as $$
declare o public.cm_posts; pid uuid;
begin
  select * into o from public.cm_posts where id = p_post;
  if o.id is null then raise exception 'Post not found'; end if;
  if o.shared_post_id is not null then select * into o from public.cm_posts where id = o.shared_post_id; end if; -- share the original, not a share of it
  if o.id is null or o.status <> 'active' or o.reach <> 'normal' then raise exception 'This post cannot be shared'; end if;
  if o.visibility = 'friends' then raise exception 'Friends-only posts cannot be shared'; end if;
  if not public.k1_is_member(o.organization_id) then raise exception 'Members only'; end if;
  insert into public.cm_posts(organization_id, author_id, body, media, visibility, shared_post_id)
  values (o.organization_id, auth.uid(), nullif(trim(coalesce(p_body, '')), ''), '[]'::jsonb,
          case when p_visibility in ('members', 'public', 'friends') then p_visibility else 'members' end, o.id)
  returning id into pid;
  update public.cm_posts set share_count = share_count + 1 where id = o.id;
  perform public.k1_cm_notify(o.author_id, o.organization_id, 'share', auth.uid(), o.id, null, public.k1_user_name(auth.uid()) || ' ने आपकी पोस्ट शेयर की');
  return pid;
end $$;

-- 7. grants -----------------------------------------------------------------------------------------------------------
revoke all on function public.k1_follow(uuid), public.k1_unfollow(uuid), public.k1_follow_list(uuid, text, int), public.trg_cm_friend_follow(),
  public.k1_shared_card(uuid), public.k1_author_rel(uuid), public.k1_feed(uuid, timestamptz, integer, uuid), public.k1_feed_search(uuid, text, text, timestamptz, integer),
  public.k1_feed2(uuid, text, integer, integer), public.k1_posts_seen(uuid[]), public.k1_post_share_to_wall(uuid, text, text) from public, anon, authenticated;
grant execute on function public.k1_follow(uuid), public.k1_unfollow(uuid), public.k1_follow_list(uuid, text, int), public.k1_posts_seen(uuid[]), public.k1_post_share_to_wall(uuid, text, text) to authenticated;
grant execute on function public.k1_feed(uuid, timestamptz, integer, uuid), public.k1_feed_search(uuid, text, text, timestamptz, integer), public.k1_feed2(uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.k1_profile_social(uuid) to authenticated;
