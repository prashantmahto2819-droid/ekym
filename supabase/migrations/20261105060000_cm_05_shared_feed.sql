-- Kalchuri One · Phase 17 · ONE community feed for the whole platform: posts from any organization's site land in the
-- root organization's feed; an organization admin may post "as the organization" (cm_posts.as_org).

alter table public.cm_posts add column if not exists as_org uuid references core.organizations(id) on delete set null;

-- root of any organization's tree (Kalchuri One)
create or replace function public.k1_root_org(p_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select t.ancestor_id from core.org_tree t join core.organizations o on o.id = t.ancestor_id
   where t.descendant_id = p_org and o.parent_id is null order by t.depth desc limit 1;
$$;
grant execute on function public.k1_root_org(uuid) to anon, authenticated;

-- membership for the root feed: active member OR team member of any organization in the subtree
create or replace function public.k1_is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_org_team(p_org)
      or exists (select 1 from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id
                  where t.ancestor_id = p_org and m.user_id = auth.uid() and m.status = 'active')
      or exists (select 1 from core.role_assignments ra join core.org_tree t on t.descendant_id = ra.organization_id
                  where t.ancestor_id = p_org and ra.user_id = auth.uid() and (ra.valid_to is null or ra.valid_to >= current_date));
$$;

-- organizations the signed-in user may post for (admin / editor roles)
create or replace function public.k1_post_as_options()
returns table (id uuid, name text, name_hi text, logo text) language sql stable security definer set search_path = '' as $$
  select distinct o.id, o.name, o.name_hi, (select s.logo from public.organization_settings s where s.organization_id = o.id)
    from core.role_assignments ra join core.roles r on r.id = ra.role_id join core.organizations o on o.id = ra.organization_id
   where ra.user_id = auth.uid() and o.status = 'active' and (ra.valid_to is null or ra.valid_to >= current_date)
     and r.permissions && array['*', 'org.*', 'org.settings.edit', 'cms.*', 'cms.post.publish', 'cms.post.create', 'community.*']
   order by o.name;
$$;
grant execute on function public.k1_post_as_options() to authenticated;

-- posting goes through an RPC now: it moves the post to the root feed and validates "as organization"
create or replace function public.k1_post_create(p_org uuid, p_body text, p_media jsonb default '[]'::jsonb, p_link text default null, p_link_kind text default null, p_visibility text default 'members', p_as_org uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare root uuid; pid uuid;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then raise exception 'Members only'; end if;
  if p_as_org is not null and not exists (select 1 from public.k1_post_as_options() o where o.id = p_as_org) then raise exception 'You cannot post for that organization'; end if;
  insert into public.cm_posts(organization_id, author_id, body, media, link_url, link_kind, visibility, as_org)
  values (root, auth.uid(), nullif(trim(coalesce(p_body, '')), ''), coalesce(p_media, '[]'::jsonb), nullif(trim(coalesce(p_link, '')), ''), p_link_kind, coalesce(p_visibility, 'members'), p_as_org)
  returning id into pid;
  return pid;
end $$;
grant execute on function public.k1_post_create(uuid, text, jsonb, text, text, text, uuid) to authenticated;

-- existing posts of sub-organizations move to the root feed
update public.cm_posts p set organization_id = public.k1_root_org(p.organization_id) where public.k1_root_org(p.organization_id) is distinct from p.organization_id;

-- feed: read from the root; author shown as the organization when as_org is set
drop function if exists public.k1_feed_search(uuid, text, text, timestamptz, int);
drop function if exists public.k1_feed(uuid, timestamptz, int, uuid);
create or replace function public.k1_feed(p_org uuid, p_before timestamptz default null, p_limit int default 20, p_post uuid default null)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[])
language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select p.id, p.author_id,
         case when p.as_org is not null then coalesce((select o.name from core.organizations o where o.id = p.as_org), 'Organization')
              else coalesce((select m.full_name from public.org_memberships m where m.user_id = p.author_id and m.status = 'active' order by m.decided_at desc nulls last limit 1), (select sp.full_name from public.site_profiles sp where sp.id = p.author_id), (select pr.full_name from public.profiles pr where pr.id = p.author_id), 'Member') end,
         case when p.as_org is not null then (select s.logo from public.organization_settings s where s.organization_id = p.as_org) else (select sp.photo_url from public.site_profiles sp where sp.id = p.author_id) end,
         p.body, p.media, p.link_url, p.link_kind, p.visibility, p.pinned, p.like_count, p.comment_count, p.share_count, p.created_at,
         exists (select 1 from public.cm_post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
         p.author_id = auth.uid(),
         core.can((select id from r), 'community.listing.moderate'),
         p.reach, p.moderation_status, p.as_org,
         case when p.as_org is not null then (select o.name_hi from core.organizations o where o.id = p.as_org) end,
         p.tags
    from public.cm_posts p
   where p.organization_id = (select id from r) and p.status = 'active'
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_post is null or p.id = p_post)
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;
grant execute on function public.k1_feed(uuid, timestamptz, int, uuid) to anon, authenticated;

create or replace function public.k1_feed_search(p_org uuid, p_q text default null, p_tag text default null, p_before timestamptz default null, p_limit int default 20)
returns table (id uuid, author_id uuid, author_name text, author_photo text, body text, media jsonb, link_url text, link_kind text, visibility text, pinned boolean, like_count int, comment_count int, share_count int, created_at timestamptz, liked boolean, mine boolean, can_moderate boolean, reach text, moderation_status text, as_org uuid, as_org_name text, tags text[])
language sql stable security definer set search_path = '' as $$
  select f.* from public.k1_feed(p_org, p_before, 400, null) f
   where (p_tag is null or lower(p_tag) = any(f.tags))
     and (p_q is null or length(trim(p_q)) < 2 or lower(coalesce(f.body, '')) like '%' || lower(trim(p_q)) || '%' or lower(f.author_name) like '%' || lower(trim(p_q)) || '%')
   limit p_limit;
$$;
grant execute on function public.k1_feed_search(uuid, text, text, timestamptz, int) to anon, authenticated;

-- tags / comments / sponsored board also read at the root
create or replace function public.k1_cm_tags(p_org uuid, p_limit int default 20)
returns table (tag text, n bigint) language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select t, count(*) from public.cm_posts p, unnest(p.tags) t
   where p.organization_id = (select id from r) and p.status = 'active' and p.reach = 'normal' and p.created_at > now() - interval '30 days'
     and (p.visibility = 'public' or public.k1_is_member((select id from r)))
   group by t order by 2 desc, 1 limit p_limit;
$$;
-- storage: members may upload post images under the root folder too
create policy community_member_write_root on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and public.k1_is_member(coalesce(public.k1_root_org(((storage.foldername(name))[1])::uuid), ((storage.foldername(name))[1])::uuid)));
