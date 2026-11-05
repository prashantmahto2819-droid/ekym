-- Kalchuri One · access model (owner approved the recommendations of 2026-11-05):
-- 1. one approval: membership active ⇄ shokpatra profile approved (synced both ways)
-- 2. tiers already exist (org_memberships.category: general | life | patron | executive | honorary)
-- 3. applicants (status 'applied') may READ the shared feed; posting/commenting/matrimony stay members-only
-- 4. family_admin scoped by social region: core.role_assignments.regions (null = whole organization)
-- 7. term end on a role: valid_to exposed in assign/team
-- plus: fix status 'pending' → 'applied' in the new-member alert and pending list; priority-alerts switch; @mentions.

-- ---------- fix: membership status is 'applied', not 'pending' ----------
create or replace function public.trg_membership_alert() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text;
begin
  if tg_op = 'INSERT' and new.status = 'applied' then
    select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = new.organization_id;
    perform public.k1_admin_notify(new.organization_id, 'org.member.approve', 'membership',
      '🙏 नया सदस्य: ' || coalesce(new.full_name_hi, new.full_name),
      coalesce(oname, '') || coalesce(' · ' || new.village, '') || coalesce(' · ' || new.mobile, '') || E'\n' || 'मंज़ूरी बाकी',
      '/admin/members', 'org_memberships', new.id);
  end if;
  return new;
end $$;

create or replace function public.k1_pending_memberships(p_limit int default 50)
returns table (id uuid, organization_id uuid, org_name text, org_slug text, priority boolean, full_name text, full_name_hi text, mobile text, village text, district text, category text, photo_path text, applied_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.organization_id, coalesce(o.name_hi, o.name), o.slug, public.k1_priority_org(o.id), m.full_name, m.full_name_hi, m.mobile, m.village, m.district, m.category, m.photo_path, m.applied_at
  from public.org_memberships m join core.organizations o on o.id = m.organization_id
  where m.status = 'applied' and (core.is_platform_admin() or core.can(m.organization_id, 'org.member.approve'))
  order by public.k1_priority_org(o.id) desc, m.applied_at asc limit least(p_limit, 500);
$$;

-- ---------- 1. one approval, synced both ways ----------
-- membership becomes active → shokpatra profile (if any) approved
create or replace function public.trg_membership_sync_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') and new.user_id is not null then
    perform set_config('k1.sync', '1', true);
    update public.profiles set status = 'approved', decided_at = coalesce(decided_at, now()), decided_by = coalesce(decided_by, auth.uid())
     where id = new.user_id and status = 'pending';
  end if;
  return new;
end $$;
create trigger trg_membership_sync_profile after insert or update of status on public.org_memberships for each row execute function public.trg_membership_sync_profile();

-- shokpatra profile approved → the user's applied membership becomes active; with none, an active membership is created in the
-- organization that owns the shokpatra data (प्रगतिशील समाज) so the person is "approved" in exactly one place
create or replace function public.trg_profile_sync_membership() returns trigger language plpgsql security definer set search_path = '' as $$
declare org uuid; n int;
begin
  if current_setting('k1.sync', true) = '1' then return new; end if;
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform set_config('k1.sync', '1', true);
    update public.org_memberships set status = 'active', decided_at = now(), decided_by = coalesce(decided_by, auth.uid()),
           member_no = coalesce(member_no, public.k1_next_number(organization_id, 'member')), valid_from = coalesce(valid_from, current_date)
     where user_id = new.id and status = 'applied';
    get diagnostics n = row_count;
    if n = 0 and not exists (select 1 from public.org_memberships where user_id = new.id and status = 'active') then
      select id into org from core.organizations where slug = 'pragatishil-kalar-samaj';
      insert into public.org_memberships(organization_id, user_id, full_name, mobile, village, district, address, status, category, consent, applied_at, decided_at, decided_by, member_no, valid_from)
      values (org, new.id, coalesce(new.full_name, 'सदस्य'), coalesce(new.phone, ''), new.village, new.district, new.address, 'active', 'general', true, now(), now(), auth.uid(), public.k1_next_number(org, 'member'), current_date);
    end if;
  end if;
  return new;
end $$;
create trigger trg_profile_sync_membership after update of status on public.profiles for each row execute function public.trg_profile_sync_membership();

-- ---------- 3. applicants may read the feed ----------
create or replace function public.k1_is_applicant(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id
                  where t.ancestor_id = p_org and m.user_id = auth.uid() and m.status = 'applied');
$$;
grant execute on function public.k1_is_applicant(uuid) to authenticated;

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
     and (p.visibility = 'public' or public.k1_is_member((select id from r)) or public.k1_is_applicant((select id from r)))
     and (p.reach = 'normal' or p.author_id = auth.uid() or core.can((select id from r), 'community.listing.moderate'))
     and (p_post is null or p.id = p_post)
     and (p_before is null or p.created_at < p_before)
   order by p.pinned desc, p.created_at desc
   limit p_limit;
$$;

-- ---------- 4. family_admin by social region; 7. term end ----------
alter table core.role_assignments add column if not exists regions uuid[];

create or replace function public.k1_social_regions()
returns table (id uuid, name text, sort_order int) language sql stable security definer set search_path = '' as $$
  select sr.id, sr.name, sr.sort_order from public.social_regions sr order by sr.sort_order, sr.name;
$$;
grant execute on function public.k1_social_regions() to authenticated;

create or replace function public.k1_assign_role_user(p_org uuid, p_user uuid, p_role_id uuid, p_regions uuid[] default null, p_valid_to date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if not core.can(p_org, 'org.roles.manage') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'No such account'; end if;
  insert into core.role_assignments(organization_id, user_id, role_id, created_by, regions, valid_to)
  values (p_org, p_user, p_role_id, auth.uid(), case when p_regions is null or cardinality(p_regions) = 0 then null else p_regions end, p_valid_to)
  on conflict do nothing returning id into rid;
  if rid is null then
    update core.role_assignments set regions = case when p_regions is null or cardinality(p_regions) = 0 then null else p_regions end, valid_to = p_valid_to
     where organization_id = p_org and user_id = p_user and role_id = p_role_id returning id into rid;
  end if;
  return rid;
end $$;
grant execute on function public.k1_assign_role_user(uuid, uuid, uuid, uuid[], date) to authenticated;

-- role-based family access honours the region list (null = whole organization)
create or replace function public.admin_can_manage_family(p_admin uuid, p_family uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles me where me.id = p_admin and me.role = 'admin' and me.status = 'approved' and (
    me.super_admin or me.admin_scope = 'all'
    or exists (select 1 from public.families f where f.id = p_family and (f.owner_id = me.id
         or exists (select 1 from public.admin_villages av where av.admin_id = me.id and av.village_id = f.village_id)))
    or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
         join public.admin_regions ar on ar.region_id = ov.region_id and ar.admin_id = me.id where m.family_id = p_family)))
  or exists (select 1 from core.platform_admins pa where pa.user_id = p_admin)
  or exists (select 1 from public.families f
              join core.role_assignments ra on ra.organization_id = f.organization_id and ra.user_id = p_admin and (ra.valid_to is null or ra.valid_to >= current_date)
              join core.roles ro on ro.id = ra.role_id and ro.permissions && array['*', 'family.*', 'family.manage']
             where f.id = p_family
               and (ra.regions is null
                    or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                                where m.family_id = p_family and ov.region_id = any(ra.regions))))
  or exists (select 1 from core.organizations o
              where o.id in (select core.orgs_with_perm(p_admin, 'family.manage'))
                and o.status = 'active'
                and o.social_region_id is not null
                and exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                             where m.family_id = p_family and ov.region_id = o.social_region_id));
$$;

-- ---------- priority alerts switch (platform admin) ----------
create or replace function public.k1_org_priority_alerts(p_org uuid, p_on boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not core.is_platform_admin() then raise exception 'Platform admins only'; end if;
  update core.organizations set branding = coalesce(branding, '{}'::jsonb) || jsonb_build_object('priority_alerts', p_on) where id = p_org;
end $$;
grant execute on function public.k1_org_priority_alerts(uuid, boolean) to authenticated;

-- ---------- @mentions ----------
alter table public.cm_posts add column if not exists mentions uuid[];
alter table public.cm_post_comments add column if not exists mentions uuid[];

create or replace function public.k1_mention_search(p_org uuid, p_q text, p_limit int default 8)
returns table (user_id uuid, full_name text, org_name text) language sql stable security definer set search_path = '' as $$
  with r as (select coalesce(public.k1_root_org(p_org), p_org) id)
  select distinct on (m.user_id) m.user_id, m.full_name, coalesce(o.name_hi, o.name)
    from public.org_memberships m join core.organizations o on o.id = m.organization_id
    join core.org_tree t on t.descendant_id = m.organization_id and t.ancestor_id = (select id from r)
   where m.status = 'active' and m.user_id is not null and public.k1_is_member((select id from r))
     and length(trim(p_q)) >= 1 and lower(m.full_name) like lower(trim(p_q)) || '%'
   order by m.user_id, m.decided_at desc nulls last
   limit least(p_limit, 20);
$$;
grant execute on function public.k1_mention_search(uuid, text, int) to authenticated;

create or replace function public.k1_post_create(p_org uuid, p_body text, p_media jsonb default '[]'::jsonb, p_link text default null, p_link_kind text default null, p_visibility text default 'members', p_as_org uuid default null, p_mentions uuid[] default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare root uuid; pid uuid; u uuid;
begin
  root := coalesce(public.k1_root_org(p_org), p_org);
  if not public.k1_is_member(root) then raise exception 'Members only'; end if;
  if p_as_org is not null and not exists (select 1 from public.k1_post_as_options() o where o.id = p_as_org) then raise exception 'You cannot post for that organization'; end if;
  insert into public.cm_posts(organization_id, author_id, body, media, link_url, link_kind, visibility, as_org, mentions)
  values (root, auth.uid(), nullif(trim(coalesce(p_body, '')), ''), coalesce(p_media, '[]'::jsonb), nullif(trim(coalesce(p_link, '')), ''), p_link_kind, coalesce(p_visibility, 'members'), p_as_org, p_mentions)
  returning id into pid;
  for u in select distinct x from unnest(coalesce(p_mentions, '{}'::uuid[])) x where x <> auth.uid() loop
    insert into public.cm_notifications(organization_id, user_id, kind, actor_id, post_id, text) values (root, u, 'mention', auth.uid(), pid, left(coalesce(p_body, ''), 120));
  end loop;
  return pid;
end $$;
grant execute on function public.k1_post_create(uuid, text, jsonb, text, text, text, uuid, uuid[]) to authenticated;

-- ---------- 3(क). matrimony profile only for active (verified) members ----------
create policy cm_matri_own_insert_member on public.cm_matrimony_profiles as restrictive for insert to authenticated
  with check (public.k1_is_member(organization_id) or core.can(organization_id, 'community.matrimony.manage'));

-- ---------- 3(ख). a person who is only a member of the umbrella (Kalchuri One) must be moved into a samaj first ----------
-- shok_user_org prefers a non-root organization; families cannot be created in the root organization
create or replace function public.shok_user_org()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.organization_id from public.org_memberships m join core.organizations o on o.id = m.organization_id
      where m.user_id = auth.uid() and m.status = 'active' and o.parent_id is not null order by m.decided_at desc nulls last limit 1),
    (select o from core.orgs_with_perm(auth.uid(), 'family.manage') o
      where exists (select 1 from core.organizations x where x.id = o and x.parent_id is not null) limit 1),
    (select m.organization_id from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active' order by m.decided_at desc nulls last limit 1),
    (select id from core.organizations where slug = 'pragatishil-kalar-samaj'));
$$;

create or replace function public.trg_shok_set_org() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is null then new.organization_id := public.shok_user_org(); end if;
  if tg_table_name = 'families' and exists (select 1 from core.organizations o where o.id = new.organization_id and o.parent_id is null)
     and not core.is_platform_admin() then
    raise exception 'पहले अपने समाज / संस्था के सदस्य बनें — वंश वृक्ष उसी संस्था में बनता है। (Admin → Members से आपको संस्था में भेजा जा सकता है)';
  end if;
  return new;
end $$;
