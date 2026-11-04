-- Kalchuri One · Phase 11b · community feed (Facebook-style): posts with photos / video links, likes, comments, shares, reports.
-- Any signed-in user may post; members-only or public visibility; moderators hide/remove.

create table public.cm_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text check (length(body) <= 5000),
  media jsonb not null default '[]'::jsonb,            -- [{type:'image', path}] in bucket community/<org>/posts/…
  link_url text,                                       -- shared link (YouTube / Instagram / Facebook / article)
  link_kind text,                                      -- youtube | instagram | facebook | other (derived client-side)
  visibility text not null default 'members' check (visibility in ('members','public')),
  status text not null default 'active' check (status in ('active','hidden','removed')),
  pinned boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  share_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or media <> '[]'::jsonb or link_url is not null)
);
create index on public.cm_posts(organization_id, status, created_at desc);
create trigger trg_cm_posts_updated before update on public.cm_posts for each row execute function public.set_updated_at();

create table public.cm_post_likes (
  post_id uuid not null references public.cm_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table public.cm_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.cm_posts(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.cm_post_comments(id) on delete cascade,
  body text not null check (length(body) between 1 and 2000),
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);
create index on public.cm_post_comments(post_id, created_at);
create table public.cm_post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.cm_posts(id) on delete cascade,
  comment_id uuid references public.cm_post_comments(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','actioned','dismissed')),
  created_at timestamptz not null default now()
);

-- counters
create or replace function public.trg_cm_like_count() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.cm_posts set like_count = like_count + 1 where id = new.post_id; return new;
  else update public.cm_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id; return old; end if;
end $$;
create trigger trg_cm_like_count after insert or delete on public.cm_post_likes for each row execute function public.trg_cm_like_count();
create or replace function public.trg_cm_comment_count() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then update public.cm_posts set comment_count = comment_count + 1 where id = new.post_id; return new;
  else update public.cm_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id; return old; end if;
end $$;
create trigger trg_cm_comment_count after insert or delete on public.cm_post_comments for each row execute function public.trg_cm_comment_count();

-- RLS
alter table public.cm_posts enable row level security;
alter table public.cm_post_likes enable row level security;
alter table public.cm_post_comments enable row level security;
alter table public.cm_post_reports enable row level security;
create policy cm_posts_public_read on public.cm_posts for select using (status = 'active' and visibility = 'public');
create policy cm_posts_member_read on public.cm_posts for select to authenticated using (status = 'active' and public.k1_is_member(organization_id));
create policy cm_posts_own on public.cm_posts for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and status = 'active' and public.k1_is_member(organization_id));
create policy cm_posts_moderate on public.cm_posts for all to authenticated using (core.can(organization_id, 'community.listing.moderate')) with check (core.can(organization_id, 'community.listing.moderate'));
create policy cm_likes_read on public.cm_post_likes for select to authenticated using (true);
create policy cm_likes_own on public.cm_post_likes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cm_comments_read on public.cm_post_comments for select using (status = 'active' and exists (select 1 from public.cm_posts p where p.id = post_id));
create policy cm_comments_own on public.cm_post_comments for all to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid() and public.k1_is_member(organization_id));
create policy cm_comments_moderate on public.cm_post_comments for all to authenticated using (core.can(organization_id, 'community.listing.moderate')) with check (core.can(organization_id, 'community.listing.moderate'));
create policy cm_reports_insert on public.cm_post_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy cm_reports_moderate on public.cm_post_reports for all to authenticated using (core.can(organization_id, 'community.listing.moderate')) with check (core.can(organization_id, 'community.listing.moderate'));
grant select on public.cm_posts, public.cm_post_comments to anon, authenticated;
grant insert, update, delete on public.cm_posts, public.cm_post_comments to authenticated;
grant select, insert, delete on public.cm_post_likes to authenticated;
grant select, insert, update on public.cm_post_reports to authenticated;

-- feed with author names (from org_memberships / site_profiles), my like flag
create or replace function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit int default 20, p_post uuid default null)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.author_id,
         coalesce((select m.full_name from public.org_memberships m where m.user_id = p.author_id and m.organization_id = p_org limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p.author_id), 'Member'),
         (select sp.photo_url from public.site_profiles sp where sp.id = p.author_id),
         p.body, p.media, p.link_url, p.link_kind, p.visibility, p.pinned, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         core.can(p_org, 'community.listing.moderate')
    from public.cm_posts p
   where p.organization_id = p_org and p.status = 'active'
     and (p.visibility = 'public' or public.k1_is_member(p_org))
     and (p_post is null or p.id = p_post)
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;
grant execute on function public.k1_feed(uuid, timestamptz, int, uuid) to anon, authenticated;

create or replace function public.k1_post_comments(p_post uuid)
returns table (id uuid, parent_id uuid, author_id uuid, author_name text, body text, created_at timestamptz, mine boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, c.parent_id, c.author_id,
         coalesce((select m.full_name from public.org_memberships m where m.user_id = c.author_id and m.organization_id = c.organization_id limit 1), (select sp.full_name from public.site_profiles sp where sp.id = c.author_id), 'Member'),
         c.body, c.created_at, c.author_id = auth.uid()
    from public.cm_post_comments c join public.cm_posts p on p.id = c.post_id
   where c.post_id = p_post and c.status = 'active' and p.status = 'active' and (p.visibility = 'public' or public.k1_is_member(p.organization_id))
   order by c.created_at;
$$;
grant execute on function public.k1_post_comments(uuid) to anon, authenticated;

create or replace function public.k1_toggle_like(p_post uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_posts where id = p_post and status = 'active';
  if org is null or not public.k1_is_member(org) then raise exception 'Members only'; end if;
  if exists (select 1 from public.cm_post_likes where post_id = p_post and user_id = auth.uid()) then
    delete from public.cm_post_likes where post_id = p_post and user_id = auth.uid(); return false;
  else insert into public.cm_post_likes(post_id, user_id) values (p_post, auth.uid()); return true; end if;
end $$;
grant execute on function public.k1_toggle_like(uuid) to authenticated;

create or replace function public.k1_post_shared(p_post uuid)
returns void language sql security definer set search_path = '' as $$ update public.cm_posts set share_count = share_count + 1 where id = p_post and status = 'active'; $$;
grant execute on function public.k1_post_shared(uuid) to anon, authenticated;

create or replace function public.k1_post_moderate(p_post uuid, p_status text, p_pinned boolean default null)
returns void language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  select organization_id into org from public.cm_posts where id = p_post;
  if org is null or not core.can(org, 'community.listing.moderate') then raise exception 'Not allowed'; end if;
  update public.cm_posts set status = coalesce(p_status, status), pinned = coalesce(p_pinned, pinned) where id = p_post;
  update public.cm_post_reports set status = 'actioned' where post_id = p_post and status = 'open' and p_status in ('hidden','removed');
end $$;
grant execute on function public.k1_post_moderate(uuid, text, boolean) to authenticated;

-- public bucket for post images (members write under <org>/posts/)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']) on conflict (id) do nothing;
create policy community_public_read on storage.objects for select using (bucket_id = 'community');
create policy community_member_write on storage.objects for insert to authenticated with check (bucket_id = 'community' and public.k1_is_member(((storage.foldername(name))[1])::uuid));
create policy community_member_delete on storage.objects for delete to authenticated using (bucket_id = 'community' and (owner = auth.uid() or core.can(((storage.foldername(name))[1])::uuid, 'community.listing.moderate')));
