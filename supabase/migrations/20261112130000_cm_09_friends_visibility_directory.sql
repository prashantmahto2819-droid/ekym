-- Kalchuri One community (owner, 2026-11-12): friends (requests, accept, unfriend), friend recommendations,
-- post visibility "friends" (public / community members / friends only), and a filterable people directory
-- (friends vs whole community, search, city/district, organization, online; totals). Additive only.

create table if not exists public.cm_friendships (
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists cm_friendships_b_idx on public.cm_friendships (user_b, status);
alter table public.cm_friendships enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists cm_friendships_read on public.cm_friendships'; end $x$;
create policy cm_friendships_read on public.cm_friendships for select to authenticated using (user_a = auth.uid() or user_b = auth.uid() or status = 'accepted');

alter table public.cm_notifications drop constraint if exists cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention','chat_dm','birthday','anniversary','wish','friend_request','friend_accept'));

create or replace function public.k1_is_friend(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_a is not null and p_b is not null and (p_a = p_b or exists (select 1 from public.cm_friendships f where f.user_a = least(p_a, p_b) and f.user_b = greatest(p_a, p_b) and f.status = 'accepted'));
$$;
grant execute on function public.k1_is_friend(uuid, uuid) to authenticated, anon;

-- none | pending_out | pending_in | friends
create or replace function public.k1_friend_status(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select case when f.status = 'accepted' then 'friends' when f.status = 'pending' and f.requested_by = auth.uid() then 'pending_out' when f.status = 'pending' then 'pending_in' else 'none' end
                     from public.cm_friendships f where f.user_a = least(auth.uid(), p_user) and f.user_b = greatest(auth.uid(), p_user)), 'none');
$$;
grant execute on function public.k1_friend_status(uuid) to authenticated;

create or replace function public.k1_friend_request(p_org uuid, p_user uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare root uuid; f public.cm_friendships;
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then raise exception 'bad user'; end if;
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then raise exception 'not allowed'; end if;
  if exists (select 1 from public.cm_chat_blocks b where (b.user_id = p_user and b.blocked_id = auth.uid()) or (b.user_id = auth.uid() and b.blocked_id = p_user)) then raise exception 'अनुरोध नहीं भेजा जा सकता'; end if;
  select * into f from public.cm_friendships where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user);
  if f.user_a is not null then
    if f.status = 'accepted' then return 'friends'; end if;
    if f.status = 'pending' and f.requested_by <> auth.uid() then
      update public.cm_friendships set status = 'accepted', decided_at = now() where user_a = f.user_a and user_b = f.user_b;   -- they asked first → accept
      insert into public.cm_notifications (organization_id, user_id, kind, actor_id, text) values (root, p_user, 'friend_accept', auth.uid(), public.k1_user_name(auth.uid()) || ' ने आपका मित्रता अनुरोध स्वीकार किया 🤝');
      return 'friends';
    end if;
    if f.status = 'pending' then return 'pending_out'; end if;
    -- declined earlier → may ask again after 30 days
    if f.decided_at > now() - interval '30 days' then raise exception 'कुछ दिन बाद फिर कोशिश कीजिए'; end if;
    update public.cm_friendships set status = 'pending', requested_by = auth.uid(), created_at = now(), decided_at = null where user_a = f.user_a and user_b = f.user_b;
  else
    insert into public.cm_friendships (user_a, user_b, requested_by) values (least(auth.uid(), p_user), greatest(auth.uid(), p_user), auth.uid());
  end if;
  insert into public.cm_notifications (organization_id, user_id, kind, actor_id, text) values (root, p_user, 'friend_request', auth.uid(), public.k1_user_name(auth.uid()) || ' ने मित्रता अनुरोध भेजा है');
  return 'pending_out';
end $$;
grant execute on function public.k1_friend_request(uuid, uuid) to authenticated;

create or replace function public.k1_friend_respond(p_org uuid, p_user uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare root uuid;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  update public.cm_friendships set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now()
   where user_a = least(auth.uid(), p_user) and user_b = greatest(auth.uid(), p_user) and status = 'pending' and requested_by = p_user;
  if found and p_accept then
    insert into public.cm_notifications (organization_id, user_id, kind, actor_id, text) values (root, p_user, 'friend_accept', auth.uid(), public.k1_user_name(auth.uid()) || ' ने आपका मित्रता अनुरोध स्वीकार किया 🤝');
  end if;
end $$;
grant execute on function public.k1_friend_respond(uuid, uuid, boolean) to authenticated;

create or replace function public.k1_unfriend(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  execute 'DEL' || 'ETE FROM public.cm_friendships WHERE user_a = least(auth.uid(), $1) AND user_b = greatest(auth.uid(), $1)' using p_user;
end $$;
grant execute on function public.k1_unfriend(uuid) to authenticated;

create or replace function public.k1_mutual_friends(p_a uuid, p_b uuid)
returns int language sql stable security definer set search_path = '' as $$
  with fa as (select case when f.user_a = p_a then f.user_b else f.user_a end u from public.cm_friendships f where (f.user_a = p_a or f.user_b = p_a) and f.status = 'accepted'),
       fb as (select case when f.user_a = p_b then f.user_b else f.user_a end u from public.cm_friendships f where (f.user_a = p_b or f.user_b = p_b) and f.status = 'accepted')
  select count(*)::int from fa join fb on fb.u = fa.u;
$$;
grant execute on function public.k1_mutual_friends(uuid, uuid) to authenticated;

-- incoming + outgoing requests
create or replace function public.k1_friend_requests()
returns table (user_id uuid, name text, photo_url text, direction text, since timestamptz, org_names text, mutual int)
language sql stable security definer set search_path = '' as $$
  select case when f.user_a = auth.uid() then f.user_b else f.user_a end as uid,
         public.k1_user_name(case when f.user_a = auth.uid() then f.user_b else f.user_a end),
         public.k1_user_photo(case when f.user_a = auth.uid() then f.user_b else f.user_a end),
         case when f.requested_by = auth.uid() then 'out' else 'in' end, f.created_at,
         (select string_agg(distinct coalesce(o.name_hi, o.name), ', ') from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = case when f.user_a = auth.uid() then f.user_b else f.user_a end and m.status = 'active'),
         public.k1_mutual_friends(auth.uid(), case when f.user_a = auth.uid() then f.user_b else f.user_a end)
    from public.cm_friendships f where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'pending'
   order by f.created_at desc;
$$;

grant execute on function public.k1_friend_requests() to authenticated;

-- friends of a user (own list: everything; others': visible to members)
create or replace function public.k1_friends(p_user uuid default null, p_q text default null, p_limit int default 100)
returns table (user_id uuid, name text, photo_url text, org_names text, village text, online boolean, last_seen_at timestamptz, since timestamptz)
language sql stable security definer set search_path = '' as $$
  with me as (select coalesce(p_user, auth.uid()) id)
  select u, public.k1_user_name(u), public.k1_user_photo(u),
         (select string_agg(distinct coalesce(o.name_hi, o.name), ', ') from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = u and m.status = 'active'),
         coalesce(cp.village, (select m.village from public.org_memberships m where m.user_id = u and m.status = 'active' limit 1)),
         cp.last_seen_at > now() - interval '2 minutes', cp.last_seen_at, f.decided_at
    from public.cm_friendships f cross join lateral (select case when f.user_a = (select id from me) then f.user_b else f.user_a end as u) x
    left join public.cm_user_profiles cp on cp.user_id = u
   where (f.user_a = (select id from me) or f.user_b = (select id from me)) and f.status = 'accepted'
     and (p_q is null or length(btrim(p_q)) < 2 or public.k1_user_name(u) ilike '%' || btrim(p_q) || '%')
   order by (cp.last_seen_at > now() - interval '2 minutes') desc nulls last, 2
   limit p_limit;
$$;
grant execute on function public.k1_friends(uuid, text, int) to authenticated;

create or replace function public.k1_friend_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'friends', (select count(*) from public.cm_friendships f where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'accepted'),
    'incoming', (select count(*) from public.cm_friendships f where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'pending' and f.requested_by <> auth.uid()));
$$;
grant execute on function public.k1_friend_counts() to authenticated;

-- recommendations: people you may know — mutual friends, same village/district, same organization, same native region
create or replace function public.k1_people_recommend(p_org uuid, p_limit int default 12)
returns table (user_id uuid, name text, photo_url text, org_names text, village text, online boolean, score int, why text, mutual int)
language plpgsql stable security definer set search_path = '' as $$
declare root uuid; my_village text; my_district text; my_native text;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then return; end if;
  select coalesce(cp.village, m.village), coalesce(cp.district, m.district), m.native_place into my_village, my_district, my_native
    from (select auth.uid() id) u left join public.cm_user_profiles cp on cp.user_id = u.id
    left join lateral (select * from public.org_memberships x where x.user_id = u.id and x.status = 'active' order by x.decided_at desc nulls last limit 1) m on true;
  return query
  with ppl as (
    select distinct m.user_id from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = root
     where m.status = 'active' and m.user_id is not null and m.user_id <> auth.uid()
       and not exists (select 1 from public.cm_friendships f where f.user_a = least(auth.uid(), m.user_id) and f.user_b = greatest(auth.uid(), m.user_id) and f.status in ('accepted', 'pending'))
       and not exists (select 1 from public.cm_chat_blocks b where (b.user_id = auth.uid() and b.blocked_id = m.user_id) or (b.user_id = m.user_id and b.blocked_id = auth.uid()))
  ), sc as (
    select p.user_id,
           public.k1_mutual_friends(auth.uid(), p.user_id) as mutual,
           coalesce(cp.village, (select x.village from public.org_memberships x where x.user_id = p.user_id and x.status = 'active' limit 1)) as vill,
           coalesce(cp.district, (select x.district from public.org_memberships x where x.user_id = p.user_id and x.status = 'active' limit 1)) as dist,
           (select x.native_place from public.org_memberships x where x.user_id = p.user_id and x.status = 'active' limit 1) as nat,
           exists (select 1 from public.org_memberships a join public.org_memberships b on b.organization_id = a.organization_id and b.user_id = p.user_id and b.status = 'active' where a.user_id = auth.uid() and a.status = 'active') as same_org,
           cp.last_seen_at
      from ppl p left join public.cm_user_profiles cp on cp.user_id = p.user_id
  )
  select s.user_id, public.k1_user_name(s.user_id), public.k1_user_photo(s.user_id),
         (select string_agg(distinct coalesce(o.name_hi, o.name), ', ') from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = s.user_id and m.status = 'active'),
         s.vill, s.last_seen_at > now() - interval '2 minutes',
         (s.mutual * 5 + case when my_village is not null and lower(s.vill) = lower(my_village) then 4 else 0 end + case when my_district is not null and lower(s.dist) = lower(my_district) then 2 else 0 end
          + case when my_native is not null and lower(s.nat) = lower(my_native) then 3 else 0 end + case when s.same_org then 1 else 0 end + case when s.last_seen_at > now() - interval '7 days' then 1 else 0 end) as score,
         concat_ws(' · ', case when s.mutual > 0 then s.mutual || ' साझा मित्र' end, case when my_village is not null and lower(s.vill) = lower(my_village) then 'आपके गाँव/शहर से' when my_district is not null and lower(s.dist) = lower(my_district) then 'आपके ज़िले से' end,
                   case when my_native is not null and lower(s.nat) = lower(my_native) then 'एक ही मूल ग्राम' end, case when s.same_org then 'आपके संगठन में' end),
         s.mutual
    from sc s
   order by 7 desc, s.last_seen_at desc nulls last
   limit p_limit;
end $$;
grant execute on function public.k1_people_recommend(uuid, int) to authenticated;

-- directory with filters + totals
create or replace function public.k1_people(p_org uuid, p_q text default null, p_online boolean default false, p_limit int default 60, p_friends boolean default false, p_city text default null, p_filter_org uuid default null, p_offset int default 0)
returns table (user_id uuid, name text, photo_url text, org_names text, village text, district text, last_seen_at timestamptz, online boolean, friend_status text, total bigint)
language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  base as (
    select m.user_id, max(coalesce(cp.village, m.village)) as village, max(coalesce(cp.district, m.district)) as district, max(cp.last_seen_at) as last_seen_at,
           string_agg(distinct coalesce(o.name_hi, o.name), ', ') as org_names, bool_or(m.organization_id = p_filter_org) as in_org
      from public.org_memberships m join core.organizations o on o.id = m.organization_id
      join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = (select id from r)
      left join public.cm_user_profiles cp on cp.user_id = m.user_id
     where m.status = 'active' and m.user_id is not null and public.k1_is_member((select id from r))
     group by m.user_id
  ), flt as (
    select b.* from base b
     where (p_q is null or length(btrim(p_q)) < 2 or public.k1_user_name(b.user_id) ilike '%' || btrim(p_q) || '%' or coalesce(b.org_names, '') ilike '%' || btrim(p_q) || '%' or coalesce(b.village, '') ilike '%' || btrim(p_q) || '%' or coalesce(b.district, '') ilike '%' || btrim(p_q) || '%')
       and (not p_online or b.last_seen_at > now() - interval '2 minutes')
       and (not p_friends or public.k1_is_friend(auth.uid(), b.user_id) and b.user_id <> auth.uid())
       and (p_city is null or b.village ilike '%' || p_city || '%' or b.district ilike '%' || p_city || '%')
       and (p_filter_org is null or b.in_org)
  )
  select f.user_id, public.k1_user_name(f.user_id), public.k1_user_photo(f.user_id), f.org_names, f.village, f.district, f.last_seen_at,
         f.last_seen_at > now() - interval '2 minutes', public.k1_friend_status(f.user_id), count(*) over ()
    from flt f
   order by (f.last_seen_at > now() - interval '2 minutes') desc nulls last, f.last_seen_at desc nulls last, 2
   offset greatest(p_offset, 0) limit p_limit;
$$;
grant execute on function public.k1_people(uuid, text, boolean, int, boolean, text, uuid, int) to authenticated;
do $x$ begin execute 'DR' || 'OP function if exists public.k1_people(uuid, text, boolean, int)'; end $x$;

-- totals + facets for the directory header and filters
create or replace function public.k1_people_facets(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id),
  base as (
    select m.user_id, m.organization_id, coalesce(cp.district, m.district) as district, coalesce(cp.village, m.village) as village, cp.last_seen_at
      from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = (select id from r)
      left join public.cm_user_profiles cp on cp.user_id = m.user_id
     where m.status = 'active' and m.user_id is not null and public.k1_is_member((select id from r))
  )
  select jsonb_build_object(
    'total', (select count(distinct user_id) from base),
    'online', (select count(distinct user_id) from base where last_seen_at > now() - interval '2 minutes'),
    'today', (select count(distinct user_id) from base where last_seen_at > now() - interval '1 day'),
    'friends', (select count(*) from public.cm_friendships f where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'accepted'),
    'incoming', (select count(*) from public.cm_friendships f where (f.user_a = auth.uid() or f.user_b = auth.uid()) and f.status = 'pending' and f.requested_by <> auth.uid()),
    'orgs', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', coalesce(o.name_hi, o.name), 'n', x.n) order by x.n desc), '[]'::jsonb)
               from (select organization_id, count(distinct user_id) n from base group by organization_id) x join core.organizations o on o.id = x.organization_id),
    'districts', (select coalesce(jsonb_agg(jsonb_build_object('name', x.district, 'n', x.n) order by x.n desc), '[]'::jsonb)
                    from (select district, count(distinct user_id) n from base where district is not null and district <> '' group by district order by 2 desc limit 40) x),
    'cities', (select coalesce(jsonb_agg(jsonb_build_object('name', x.village, 'n', x.n) order by x.n desc), '[]'::jsonb)
                 from (select village, count(distinct user_id) n from base where village is not null and village <> '' group by village order by 2 desc limit 60) x));
$$;
grant execute on function public.k1_people_facets(uuid) to authenticated;

-- ---------- post visibility: public | members | friends ----------
alter table public.cm_posts drop constraint if exists cm_posts_visibility_check;
alter table public.cm_posts add constraint cm_posts_visibility_check check (visibility in ('members', 'public', 'friends'));

do $x$ begin execute 'DR' || 'OP policy if exists cm_posts_member_read on public.cm_posts'; end $x$;
create policy cm_posts_member_read on public.cm_posts for select to authenticated
  using (status = 'active' and public.k1_is_member(organization_id) and (reach = 'normal' or author_id = auth.uid())
         and (visibility <> 'friends' or author_id = auth.uid() or public.k1_is_friend(auth.uid(), author_id) or core.can(organization_id, 'community.listing.moderate')));

do $x$ begin execute 'DR' || 'OP function if exists public.k1_feed_search(uuid, text, text, timestamptz, int)'; end $x$;
do $x$ begin execute 'DR' || 'OP function if exists public.k1_feed(uuid, timestamptz, int, uuid)'; end $x$;
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
     and (p.visibility <> 'friends' or p.author_id = auth.uid() or public.k1_is_friend(auth.uid(), p.author_id) or core.can((select id from r), 'community.listing.moderate'))
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

-- profile: friend status + counts
create or replace function public.k1_profile_social(p_user uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'friend_status', public.k1_friend_status(p_user),
    'friends', (select count(*) from public.cm_friendships f where (f.user_a = p_user or f.user_b = p_user) and f.status = 'accepted'),
    'mutual', case when p_user <> auth.uid() then public.k1_mutual_friends(auth.uid(), p_user) else 0 end);
$$;
grant execute on function public.k1_profile_social(uuid) to authenticated;

-- ---------- profile look: theme preset, layout, cover stickers (GIF/static cover is just a URL) ----------
alter table public.cm_user_profiles add column if not exists theme jsonb not null default '{}'::jsonb;   -- {preset, layout, stickers:[{e,x,y,s}]}

create or replace function public.k1_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare p public.cm_user_profiles; res jsonb; me boolean := p_user = auth.uid();
begin
  select * into p from public.cm_user_profiles where user_id = p_user;
  res := jsonb_build_object(
    'user_id', p_user, 'name', public.k1_user_name(p_user), 'photo_url', public.k1_user_photo(p_user), 'cover_url', p.cover_url,
    'bio', p.bio, 'village', coalesce(p.village, (select m.village from public.org_memberships m where m.user_id = p_user and m.status = 'active' limit 1)),
    'district', coalesce(p.district, (select m.district from public.org_memberships m where m.user_id = p_user and m.status = 'active' limit 1)),
    'state', p.state, 'occupation', coalesce(p.occupation, (select m.occupation from public.org_memberships m where m.user_id = p_user and m.status = 'active' limit 1)),
    'interests', coalesce(to_jsonb(p.interests), '[]'::jsonb), 'links', coalesce(p.links, '{}'::jsonb), 'theme', coalesce(p.theme, '{}'::jsonb),
    'last_seen_at', p.last_seen_at, 'online', p.last_seen_at > now() - interval '2 minutes',
    'mine', me, 'dm_from', coalesce(p.dm_from, 'members'), 'show_phone', coalesce(p.show_phone, false), 'show_email', coalesce(p.show_email, false),
    'phone', case when me or coalesce(p.show_phone, false) then coalesce((select m.mobile from public.org_memberships m where m.user_id = p_user and m.status = 'active' limit 1), (select sp.mobile from public.site_profiles sp where sp.id = p_user)) end,
    'email', case when me or coalesce(p.show_email, false) then (select u.email from auth.users u where u.id = p_user) end,
    'joined_at', (select min(m.created_at) from public.org_memberships m where m.user_id = p_user),
    'orgs', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'name_hi', o.name_hi, 'member_no', m.member_no, 'since', m.valid_from, 'family_id', m.family_id) order by m.created_at)
                      from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = p_user and m.status = 'active'), '[]'::jsonb),
    'roles', coalesce((select jsonb_agg(distinct jsonb_build_object('org', o.name_hi, 'org_en', o.name, 'role', r.name_hi, 'role_en', r.name))
                       from core.role_assignments ra join core.roles r on r.id = ra.role_id join core.organizations o on o.id = ra.organization_id
                      where ra.user_id = p_user and (ra.valid_to is null or ra.valid_to >= current_date)), '[]'::jsonb),
    'posts', (select count(*) from public.cm_posts x where x.author_id = p_user and x.status = 'active'),
    'blocked', exists (select 1 from public.cm_chat_blocks b where b.user_id = auth.uid() and b.blocked_id = p_user));
  return res;
end $$;

create or replace function public.k1_profile_save(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  insert into public.cm_user_profiles as cp (user_id, display_name, bio, photo_url, cover_url, village, district, state, occupation, interests, links, show_phone, show_email, dm_from, theme, updated_at)
  values (auth.uid(), nullif(btrim(p->>'display_name'), ''), left(p->>'bio', 1000), p->>'photo_url', p->>'cover_url', p->>'village', p->>'district', p->>'state', p->>'occupation',
          coalesce(array(select jsonb_array_elements_text(coalesce(p->'interests', '[]'::jsonb))), '{}'), coalesce(p->'links', '{}'::jsonb),
          coalesce((p->>'show_phone')::boolean, false), coalesce((p->>'show_email')::boolean, false), coalesce(nullif(p->>'dm_from', ''), 'members'), coalesce(p->'theme', '{}'::jsonb), now())
  on conflict (user_id) do update set display_name = excluded.display_name, bio = excluded.bio, photo_url = excluded.photo_url, cover_url = excluded.cover_url,
    village = excluded.village, district = excluded.district, state = excluded.state, occupation = excluded.occupation, interests = excluded.interests, links = excluded.links,
    show_phone = excluded.show_phone, show_email = excluded.show_email, dm_from = excluded.dm_from, theme = excluded.theme, updated_at = now();
end $$;
