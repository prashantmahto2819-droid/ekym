-- Kalchuri One community (owner, 2026-11-12): real-time chat + social profiles.
-- * Chat rooms per organization (channels grouped by category; the root organization = cross-community channels),
--   private groups, 1:1 DMs; messages via Supabase Realtime; unread counts; blocks; moderation delete.
-- * Presence: cm_user_profiles.last_seen_at (touched by the app) + Realtime presence in the browser.
-- * Social profile: cover photo, display photo, bio, details, privacy toggles; public profile page; feed shows the photo.
-- Additive only.

-- ---------- profiles ----------
create table if not exists public.cm_user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  photo_url text,
  cover_url text,
  village text, district text, state text,
  occupation text,
  interests text[] not null default '{}',
  links jsonb not null default '{}'::jsonb,          -- {facebook, instagram, youtube, website}
  show_phone boolean not null default false,
  show_email boolean not null default false,
  dm_from text not null default 'members' check (dm_from in ('members', 'nobody')),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cm_user_profiles enable row level security;
drop policy if exists cm_user_profiles_read on public.cm_user_profiles;
create policy cm_user_profiles_read on public.cm_user_profiles for select to authenticated using (true);
drop policy if exists cm_user_profiles_own on public.cm_user_profiles;
create policy cm_user_profiles_own on public.cm_user_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- profile photos live in the public 'community' bucket under profiles/<uid>/…
drop policy if exists community_profile_write on storage.objects;
create policy community_profile_write on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists community_profile_update on storage.objects;
create policy community_profile_update on storage.objects for update to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text);
drop policy if exists community_profile_delete on storage.objects;
create policy community_profile_delete on storage.objects for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = 'profiles' and (storage.foldername(name))[2] = auth.uid()::text);

-- one place that answers "what do we call this user and what is their photo"
create or replace function public.k1_user_name(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif((select p.display_name from public.cm_user_profiles p where p.user_id = p_user), ''),
    (select m.full_name from public.org_memberships m where m.user_id = p_user and m.status = 'active' order by m.decided_at desc nulls last limit 1),
    (select sp.full_name from public.site_profiles sp where sp.id = p_user),
    (select pr.full_name from public.profiles pr where pr.id = p_user),
    'Member');
$$;
create or replace function public.k1_user_photo(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif((select p.photo_url from public.cm_user_profiles p where p.user_id = p_user), ''), (select sp.photo_url from public.site_profiles sp where sp.id = p_user));
$$;
grant execute on function public.k1_user_name(uuid), public.k1_user_photo(uuid) to authenticated, anon;

create or replace function public.k1_touch_presence()
returns void language sql security definer set search_path = '' as $$
  insert into public.cm_user_profiles (user_id, last_seen_at) values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = now();
$$;
grant execute on function public.k1_touch_presence() to authenticated;

-- the profile page
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
    'interests', coalesce(to_jsonb(p.interests), '[]'::jsonb), 'links', coalesce(p.links, '{}'::jsonb),
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
grant execute on function public.k1_profile(uuid) to authenticated;

create or replace function public.k1_profile_save(p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  insert into public.cm_user_profiles as cp (user_id, display_name, bio, photo_url, cover_url, village, district, state, occupation, interests, links, show_phone, show_email, dm_from, updated_at)
  values (auth.uid(), nullif(btrim(p->>'display_name'), ''), left(p->>'bio', 1000), p->>'photo_url', p->>'cover_url', p->>'village', p->>'district', p->>'state', p->>'occupation',
          coalesce(array(select jsonb_array_elements_text(coalesce(p->'interests', '[]'::jsonb))), '{}'), coalesce(p->'links', '{}'::jsonb),
          coalesce((p->>'show_phone')::boolean, false), coalesce((p->>'show_email')::boolean, false), coalesce(nullif(p->>'dm_from', ''), 'members'), now())
  on conflict (user_id) do update set display_name = excluded.display_name, bio = excluded.bio, photo_url = excluded.photo_url, cover_url = excluded.cover_url,
    village = excluded.village, district = excluded.district, state = excluded.state, occupation = excluded.occupation, interests = excluded.interests, links = excluded.links,
    show_phone = excluded.show_phone, show_email = excluded.show_email, dm_from = excluded.dm_from, updated_at = now();
end $$;
grant execute on function public.k1_profile_save(jsonb) to authenticated;

-- posts by one person (for the profile page), through the feed so visibility rules hold
create or replace function public.k1_user_posts_json(p_org uuid, p_user uuid, p_limit int default 20)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) from (select * from public.k1_feed(p_org, null, 400, null) f where f.author_id = p_user limit p_limit) f;
$$;
grant execute on function public.k1_user_posts_json(uuid, uuid, int) to anon, authenticated;

-- feed: prefer the social-profile photo
create or replace function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit int default 20, p_post uuid default null)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[])
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
         p.tags
    from public.cm_posts p
   where p.organization_id = (select id from r) and p.status = 'active'
     and (p_post is null or p.id = p_post)
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;

-- people directory (members of any organization under the caller's root)
create or replace function public.k1_people(p_org uuid, p_q text default null, p_online boolean default false, p_limit int default 60)
returns table (user_id uuid, name text, photo_url text, org_names text, village text, last_seen_at timestamptz, online boolean)
language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select m.user_id, public.k1_user_name(m.user_id), public.k1_user_photo(m.user_id),
         string_agg(distinct coalesce(o.name_hi, o.name), ', '), max(m.village), max(cp.last_seen_at), bool_or(cp.last_seen_at > now() - interval '2 minutes')
    from public.org_memberships m join core.organizations o on o.id = m.organization_id
    join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = (select id from r)
    left join public.cm_user_profiles cp on cp.user_id = m.user_id
   where m.status = 'active' and m.user_id is not null and public.k1_is_member((select id from r))
     and (p_q is null or length(btrim(p_q)) < 2 or public.k1_user_name(m.user_id) ilike '%' || btrim(p_q) || '%' or coalesce(o.name_hi, '') ilike '%' || btrim(p_q) || '%' or coalesce(o.name, '') ilike '%' || btrim(p_q) || '%' or coalesce(m.village, '') ilike '%' || btrim(p_q) || '%')
     and (not p_online or cp.last_seen_at > now() - interval '2 minutes')
   group by m.user_id
   order by bool_or(cp.last_seen_at > now() - interval '2 minutes') desc, max(cp.last_seen_at) desc nulls last, 2
   limit p_limit;
$$;
grant execute on function public.k1_people(uuid, text, boolean, int) to authenticated;

-- ---------- chat ----------
alter table public.cm_notifications drop constraint if exists cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention','chat_dm'));

create table if not exists public.cm_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  kind text not null default 'channel' check (kind in ('channel', 'group', 'dm')),
  name text not null,
  name_hi text,
  description text,
  category text,                       -- channels only: section heading in the sidebar
  sort_order int not null default 100,
  is_private boolean not null default false,   -- channel: invite-only
  dm_key text unique,                  -- dm: least(uid)::text || ':' || greatest(uid)::text
  created_by uuid references auth.users(id) on delete set null,
  archived boolean not null default false,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists cm_chat_rooms_org_idx on public.cm_chat_rooms (organization_id, kind, archived);

create table if not exists public.cm_chat_members (
  room_id uuid not null references public.cm_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (room_id, user_id)
);
create index if not exists cm_chat_members_user_idx on public.cm_chat_members (user_id);

create table if not exists public.cm_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.cm_chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text,
  media jsonb not null default '[]'::jsonb,     -- [{type:'image', url}]
  reply_to uuid references public.cm_chat_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid
);
create index if not exists cm_chat_messages_room_idx on public.cm_chat_messages (room_id, created_at desc);

create table if not exists public.cm_chat_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

alter table public.cm_chat_rooms enable row level security;
alter table public.cm_chat_members enable row level security;
alter table public.cm_chat_messages enable row level security;
alter table public.cm_chat_blocks enable row level security;

-- who may read a room
create or replace function public.k1_chat_can_read(p_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.cm_chat_rooms r
     where r.id = p_room and not r.archived
       and ((r.kind = 'channel' and not r.is_private and public.k1_is_member(r.organization_id))
            or exists (select 1 from public.cm_chat_members cm where cm.room_id = r.id and cm.user_id = auth.uid())
            or core.can(r.organization_id, 'community.listing.moderate')));
$$;
grant execute on function public.k1_chat_can_read(uuid) to authenticated;

drop policy if exists cm_chat_rooms_read on public.cm_chat_rooms;
create policy cm_chat_rooms_read on public.cm_chat_rooms for select to authenticated using (public.k1_chat_can_read(id));
drop policy if exists cm_chat_members_read on public.cm_chat_members;
create policy cm_chat_members_read on public.cm_chat_members for select to authenticated using (public.k1_chat_can_read(room_id));
drop policy if exists cm_chat_messages_read on public.cm_chat_messages;
create policy cm_chat_messages_read on public.cm_chat_messages for select to authenticated using (public.k1_chat_can_read(room_id));
drop policy if exists cm_chat_blocks_own on public.cm_chat_blocks;
create policy cm_chat_blocks_own on public.cm_chat_blocks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- writes go through the RPCs below (security definer)

-- realtime: new messages stream to open rooms (RLS applies)
do $$ begin
  alter publication supabase_realtime add table public.cm_chat_messages;
exception when duplicate_object then null; when others then null; end $$;

-- default channels for an organization (created on first visit)
create or replace function public.k1_chat_ensure_defaults(p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare is_root boolean;
begin
  if exists (select 1 from public.cm_chat_rooms r where r.organization_id = p_org and r.kind = 'channel') then return; end if;
  select parent_id is null into is_root from core.organizations where id = p_org;
  insert into public.cm_chat_rooms (organization_id, name, name_hi, description, category, sort_order) values
    (p_org, 'general', 'चर्चा', 'सबके लिए खुली बातचीत', 'सामान्य', 10),
    (p_org, 'introductions', 'परिचय', 'नए सदस्य अपना परिचय दें', 'सामान्य', 20),
    (p_org, 'announcements', 'सूचनाएँ', 'संगठन की घोषणाएँ (सिर्फ़ टीम लिखे)', 'सामान्य', 30),
    (p_org, 'help', 'सहायता', 'किसी को मदद चाहिए — यहाँ लिखें', 'सेवा', 40),
    (p_org, 'blood', 'रक्तदान', 'रक्त की ज़रूरत / रक्तदाता', 'सेवा', 50),
    (p_org, 'jobs', 'रोज़गार', 'नौकरी, व्यवसाय, अवसर', 'अवसर', 60),
    (p_org, 'market', 'खरीद-बिक्री', 'सामान, सेवाएँ, किराया', 'अवसर', 70),
    (p_org, 'events', 'कार्यक्रम', 'आयोजन, बैठकें, निमंत्रण', 'कार्यक्रम', 80),
    (p_org, 'matrimony', 'वैवाहिक', 'रिश्तों की चर्चा (शालीनता से)', 'परिवार', 90);
  if is_root then
    insert into public.cm_chat_rooms (organization_id, name, name_hi, description, category, sort_order) values
      (p_org, 'all-kalchuri', 'कलचुरी समाज — सब संगठन', 'सभी संगठनों के सदस्य एक जगह', 'कलचुरी समाज', 1);
  end if;
end $$;

-- sidebar: channels of this org + root org (categories), my groups and DMs, with unread counts
create or replace function public.k1_chat_rooms(p_org uuid)
returns table (id uuid, organization_id uuid, org_name text, kind text, name text, name_hi text, description text, category text, sort_order int, is_private boolean,
               member_count bigint, unread bigint, last_message_at timestamptz, last_text text, joined boolean, other_user uuid, other_name text, other_photo text, other_online boolean)
language plpgsql stable security definer set search_path = '' as $$
declare root uuid;
begin
  if auth.uid() is null then return; end if;
  root := coalesce(public.k1_root_org(p_org), p_org);
  return query
  with mine as (select cm.room_id, cm.last_read_at from public.cm_chat_members cm where cm.user_id = auth.uid())
  select r.id, r.organization_id, coalesce(o.name_hi, o.name), r.kind, r.name, r.name_hi, r.description, r.category, r.sort_order, r.is_private,
         (select count(*) from public.cm_chat_members x where x.room_id = r.id),
         (select count(*) from public.cm_chat_messages m where m.room_id = r.id and m.deleted_at is null and m.sender_id <> auth.uid() and m.created_at > coalesce((select mi.last_read_at from mine mi where mi.room_id = r.id), case when r.kind = 'channel' then now() - interval '1 day' else '1970-01-01'::timestamptz end)),
         r.last_message_at,
         (select left(coalesce(m.body, case when jsonb_array_length(m.media) > 0 then '📷 फोटो' end), 80) from public.cm_chat_messages m where m.room_id = r.id and m.deleted_at is null order by m.created_at desc limit 1),
         exists (select 1 from mine mi where mi.room_id = r.id),
         ou.user_id, case when ou.user_id is not null then public.k1_user_name(ou.user_id) end, case when ou.user_id is not null then public.k1_user_photo(ou.user_id) end,
         case when ou.user_id is not null then (select cp.last_seen_at > now() - interval '2 minutes' from public.cm_user_profiles cp where cp.user_id = ou.user_id) end
    from public.cm_chat_rooms r join core.organizations o on o.id = r.organization_id
    left join lateral (select x.user_id from public.cm_chat_members x where x.room_id = r.id and x.user_id <> auth.uid() and r.kind = 'dm' limit 1) ou on true
   where not r.archived
     and ((r.kind = 'channel' and r.organization_id in (p_org, root) and (not r.is_private or exists (select 1 from mine mi where mi.room_id = r.id)) and public.k1_is_member(r.organization_id))
          or (r.kind in ('group', 'dm') and exists (select 1 from mine mi where mi.room_id = r.id)))
   order by case r.kind when 'channel' then 0 when 'group' then 1 else 2 end, case when r.organization_id = root and r.organization_id <> p_org then 1 else 0 end, r.sort_order, r.last_message_at desc nulls last;
end $$;
grant execute on function public.k1_chat_rooms(uuid) to authenticated;

create or replace function public.k1_chat_unread()
returns int language sql stable security definer set search_path = '' as $$
  select coalesce(sum((select count(*) from public.cm_chat_messages m where m.room_id = cm.room_id and m.deleted_at is null and m.sender_id <> auth.uid() and m.created_at > cm.last_read_at)), 0)::int
    from public.cm_chat_members cm join public.cm_chat_rooms r on r.id = cm.room_id and not r.archived
   where cm.user_id = auth.uid() and not cm.muted;
$$;
grant execute on function public.k1_chat_unread() to authenticated;

-- open (and join) a room: marks read; channels auto-join
create or replace function public.k1_chat_read(p_room uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.k1_chat_can_read(p_room) then raise exception 'not allowed'; end if;
  insert into public.cm_chat_members (room_id, user_id) values (p_room, auth.uid())
  on conflict (room_id, user_id) do update set last_read_at = now();
end $$;
grant execute on function public.k1_chat_read(uuid) to authenticated;

create or replace function public.k1_chat_messages(p_room uuid, p_before timestamptz default null, p_limit int default 40)
returns table (id uuid, sender_id uuid, sender_name text, sender_photo text, body text, media jsonb, reply_to uuid, reply_text text, reply_name text, created_at timestamptz, edited_at timestamptz, deleted boolean, mine boolean)
language sql stable security definer set search_path = '' as $$
  select m.id, m.sender_id, public.k1_user_name(m.sender_id), public.k1_user_photo(m.sender_id),
         case when m.deleted_at is null then m.body end, case when m.deleted_at is null then m.media else '[]'::jsonb end,
         m.reply_to, (select left(coalesce(x.body, '📷'), 120) from public.cm_chat_messages x where x.id = m.reply_to), (select public.k1_user_name(x.sender_id) from public.cm_chat_messages x where x.id = m.reply_to),
         m.created_at, m.edited_at, m.deleted_at is not null, m.sender_id = auth.uid()
    from public.cm_chat_messages m
   where m.room_id = p_room and public.k1_chat_can_read(p_room)
     and (p_before is null or m.created_at < p_before)
     and not exists (select 1 from public.cm_chat_blocks b where b.user_id = auth.uid() and b.blocked_id = m.sender_id)
   order by m.created_at desc limit least(p_limit, 100);
$$;
grant execute on function public.k1_chat_messages(uuid, timestamptz, int) to authenticated;

create or replace function public.k1_chat_send(p_room uuid, p_body text, p_media jsonb default '[]'::jsonb, p_reply uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare r public.cm_chat_rooms; mid uuid; other uuid;
begin
  select * into r from public.cm_chat_rooms where id = p_room;
  if r.id is null or r.archived or not public.k1_chat_can_read(p_room) then raise exception 'not allowed'; end if;
  if coalesce(btrim(p_body), '') = '' and coalesce(jsonb_array_length(p_media), 0) = 0 then raise exception 'empty'; end if;
  if r.kind = 'channel' and r.name = 'announcements' and not core.is_org_team(r.organization_id) then raise exception 'सूचनाएँ चैनल में सिर्फ़ संगठन की टीम लिखती है'; end if;
  if r.kind = 'dm' then
    select user_id into other from public.cm_chat_members where room_id = r.id and user_id <> auth.uid() limit 1;
    if exists (select 1 from public.cm_chat_blocks b where (b.user_id = other and b.blocked_id = auth.uid()) or (b.user_id = auth.uid() and b.blocked_id = other)) then raise exception 'संदेश नहीं भेजा जा सकता'; end if;
  end if;
  -- simple flood guard: 20 messages / minute
  if (select count(*) from public.cm_chat_messages m where m.sender_id = auth.uid() and m.created_at > now() - interval '1 minute') >= 20 then raise exception 'थोड़ा धीरे — एक मिनट में बहुत संदेश'; end if;
  insert into public.cm_chat_members (room_id, user_id) values (p_room, auth.uid()) on conflict (room_id, user_id) do update set last_read_at = now();
  insert into public.cm_chat_messages (room_id, sender_id, body, media, reply_to) values (p_room, auth.uid(), left(btrim(p_body), 4000), coalesce(p_media, '[]'::jsonb), p_reply) returning id into mid;
  update public.cm_chat_rooms set last_message_at = now() where id = p_room;
  -- DM: in-app notification for the other person (existing community notifications table)
  if r.kind = 'dm' and other is not null then
    begin
      insert into public.cm_notifications (organization_id, user_id, kind, text, actor_id)
      values (r.organization_id, other, 'chat_dm', public.k1_user_name(auth.uid()) || ': ' || left(coalesce(p_body, '📷 फोटो'), 140), auth.uid());
    exception when others then null; end;
  end if;
  return mid;
end $$;
grant execute on function public.k1_chat_send(uuid, text, jsonb, uuid) to authenticated;

create or replace function public.k1_chat_delete(p_message uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.cm_chat_messages; r public.cm_chat_rooms;
begin
  select * into m from public.cm_chat_messages where id = p_message; if m.id is null then return; end if;
  select * into r from public.cm_chat_rooms where id = m.room_id;
  if not (m.sender_id = auth.uid() or core.can(r.organization_id, 'community.listing.moderate')
          or exists (select 1 from public.cm_chat_members x where x.room_id = r.id and x.user_id = auth.uid() and x.role in ('owner', 'admin'))) then raise exception 'not allowed'; end if;
  update public.cm_chat_messages set deleted_at = now(), deleted_by = auth.uid() where id = p_message;
end $$;
grant execute on function public.k1_chat_delete(uuid) to authenticated;

-- 1:1 conversation (created on first open)
create or replace function public.k1_chat_open_dm(p_org uuid, p_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare k text; rid uuid; root uuid;
begin
  if auth.uid() is null or p_user is null or p_user = auth.uid() then raise exception 'bad user'; end if;
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then raise exception 'not allowed'; end if;
  if exists (select 1 from public.cm_chat_blocks b where b.user_id = p_user and b.blocked_id = auth.uid()) then raise exception 'यह सदस्य आपसे संदेश नहीं ले रहा'; end if;
  if coalesce((select cp.dm_from from public.cm_user_profiles cp where cp.user_id = p_user), 'members') = 'nobody' and not core.can(root, 'community.listing.moderate') then raise exception 'यह सदस्य सीधे संदेश नहीं लेता'; end if;
  k := least(auth.uid()::text, p_user::text) || ':' || greatest(auth.uid()::text, p_user::text);
  select id into rid from public.cm_chat_rooms where dm_key = k;
  if rid is null then
    insert into public.cm_chat_rooms (organization_id, kind, name, dm_key, created_by) values (root, 'dm', 'dm', k, auth.uid()) returning id into rid;
    insert into public.cm_chat_members (room_id, user_id) values (rid, auth.uid()), (rid, p_user) on conflict do nothing;
  end if;
  return rid;
end $$;
grant execute on function public.k1_chat_open_dm(uuid, uuid) to authenticated;

-- channels (team) and groups (any member)
create or replace function public.k1_chat_create_room(p_org uuid, p_kind text, p_name text, p_name_hi text default null, p_category text default null, p_private boolean default false, p_members uuid[] default '{}', p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid; root uuid;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if p_kind = 'channel' then
    if not core.can(p_org, 'community.listing.moderate') then raise exception 'चैनल सिर्फ़ संगठन की टीम बनाती है'; end if;
  elsif p_kind = 'group' then
    if not public.k1_is_member(root) then raise exception 'not allowed'; end if;
  else raise exception 'bad kind'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'नाम चाहिए'; end if;
  insert into public.cm_chat_rooms (organization_id, kind, name, name_hi, description, category, is_private, created_by, sort_order)
  values (p_org, p_kind, left(btrim(p_name), 60), nullif(btrim(p_name_hi), ''), nullif(btrim(p_description), ''), nullif(btrim(p_category), ''), case when p_kind = 'group' then true else coalesce(p_private, false) end, auth.uid(),
          coalesce((select max(sort_order) + 10 from public.cm_chat_rooms where organization_id = p_org and kind = 'channel'), 100))
  returning id into rid;
  insert into public.cm_chat_members (room_id, user_id, role) values (rid, auth.uid(), 'owner') on conflict do nothing;
  insert into public.cm_chat_members (room_id, user_id) select rid, u from unnest(coalesce(p_members, '{}')) u where u <> auth.uid() on conflict do nothing;
  return rid;
end $$;
grant execute on function public.k1_chat_create_room(uuid, text, text, text, text, boolean, uuid[], text) to authenticated;

create or replace function public.k1_chat_room_update(p_room uuid, p jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.cm_chat_rooms;
begin
  select * into r from public.cm_chat_rooms where id = p_room; if r.id is null then raise exception 'not found'; end if;
  if not (core.can(r.organization_id, 'community.listing.moderate') or exists (select 1 from public.cm_chat_members x where x.room_id = r.id and x.user_id = auth.uid() and x.role in ('owner', 'admin'))) then raise exception 'not allowed'; end if;
  update public.cm_chat_rooms set
    name = coalesce(nullif(btrim(p->>'name'), ''), name), name_hi = coalesce(p->>'name_hi', name_hi), description = coalesce(p->>'description', description),
    category = coalesce(p->>'category', category), sort_order = coalesce((p->>'sort_order')::int, sort_order),
    is_private = coalesce((p->>'is_private')::boolean, is_private), archived = coalesce((p->>'archived')::boolean, archived)
  where id = p_room;
end $$;
grant execute on function public.k1_chat_room_update(uuid, jsonb) to authenticated;

create or replace function public.k1_chat_add_members(p_room uuid, p_members uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare r public.cm_chat_rooms;
begin
  select * into r from public.cm_chat_rooms where id = p_room; if r.id is null or r.kind = 'dm' then raise exception 'not allowed'; end if;
  if not (core.can(r.organization_id, 'community.listing.moderate') or exists (select 1 from public.cm_chat_members x where x.room_id = r.id and x.user_id = auth.uid() and x.role in ('owner', 'admin'))) then raise exception 'not allowed'; end if;
  insert into public.cm_chat_members (room_id, user_id) select p_room, u from unnest(p_members) u on conflict do nothing;
end $$;
grant execute on function public.k1_chat_add_members(uuid, uuid[]) to authenticated;

create or replace function public.k1_chat_leave(p_room uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.cm_chat_members where room_id = p_room and user_id = auth.uid();
$$;
grant execute on function public.k1_chat_leave(uuid) to authenticated;

create or replace function public.k1_chat_members(p_room uuid)
returns table (user_id uuid, name text, photo_url text, role text, online boolean, last_seen_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select cm.user_id, public.k1_user_name(cm.user_id), public.k1_user_photo(cm.user_id), cm.role,
         cp.last_seen_at > now() - interval '2 minutes', cp.last_seen_at
    from public.cm_chat_members cm left join public.cm_user_profiles cp on cp.user_id = cm.user_id
   where cm.room_id = p_room and public.k1_chat_can_read(p_room)
   order by 5 desc nulls last, 2;
$$;
grant execute on function public.k1_chat_members(uuid) to authenticated;

create or replace function public.k1_chat_block(p_user uuid, p_on boolean)
returns void language sql security definer set search_path = '' as $$
  delete from public.cm_chat_blocks where user_id = auth.uid() and blocked_id = p_user and not p_on;
  insert into public.cm_chat_blocks (user_id, blocked_id) select auth.uid(), p_user where p_on on conflict do nothing;
$$;
grant execute on function public.k1_chat_block(uuid, boolean) to authenticated;
