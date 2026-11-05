-- Kalchuri One · Phase 17 · organizations self-register on the platform (pending → platform admin approves),
-- umbrella admins see every member of every organization and can move a member to another organization,
-- long "about us" text per organization, donations switched off for now (modules.donate=false).

-- ---------- about us (long, markup) ----------
alter table public.organization_settings add column if not exists about_long text, add column if not exists about_long_hi text;

-- ---------- donations off for now (owner's decision; switch back on in Admin → Organization settings → Modules) ----------
update core.organizations set branding = branding || jsonb_build_object('modules', coalesce(branding->'modules', '{}'::jsonb) || '{"donate": false}'::jsonb) where status = 'active';

-- ---------- organization self-registration ----------
-- the guard trigger nulls parent_id for ordinary users; k1_org_register sets a transaction flag to keep the parent
create or replace function core.organizations_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if core.is_platform_admin() or auth.uid() is null then return new; end if;  -- platform admin / service role
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.created_by := auth.uid();
    if new.parent_id is not null and not core.can(new.parent_id, 'org.children.manage') and coalesce(current_setting('k1.register', true), '') <> '1' then
      new.parent_id := null;
    end if;
  else
    if new.status is distinct from old.status and coalesce(current_setting('k1.register', true), '') <> '1' then raise exception 'Only the platform admin can change organization status'; end if;
    if new.parent_id is distinct from old.parent_id
       and not (new.parent_id is not null and core.can(new.parent_id, 'org.children.manage')) then
      raise exception 'Changing the parent organization needs permission in the new parent';
    end if;
    if new.slug is distinct from old.slug then raise exception 'Only the platform admin can change the slug'; end if;
  end if;
  return new;
end $$;

create or replace function public.k1_slugify(p text) returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.k1_org_register(p_name text, p_name_hi text, p_kind text, p_level text, p_city text, p_district text, p_state text, p_about text, p_contact_name text, p_phone text, p_email text, p_parent uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare root uuid; parent uuid; slug text; base text; n int := 0; oid uuid; oa uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 then raise exception 'Organization name is too short'; end if;
  select id into root from core.organizations where slug = 'kalchuri-one';
  parent := coalesce(p_parent, root);
  if not exists (select 1 from core.organizations where id = parent and status = 'active') then raise exception 'Parent organization not found'; end if;
  -- one pending request per user at a time
  if exists (select 1 from core.organizations o where o.status = 'pending' and o.created_by = auth.uid()) then raise exception 'You already have an organization waiting for approval'; end if;
  base := left(coalesce(nullif(public.k1_slugify(p_name), ''), 'org'), 40);
  if length(base) < 3 then base := base || '-samaj'; end if;
  slug := base;
  while exists (select 1 from core.organizations where core.organizations.slug = slug) loop n := n + 1; slug := base || '-' || n; end loop;
  perform set_config('k1.register', '1', true);
  insert into core.organizations(slug, name, name_hi, short_name, kind, level, parent_id, city, district, state, status, created_by, share_with_parent)
  values (slug, trim(p_name), nullif(trim(p_name_hi), ''), left(trim(p_name), 24), coalesce(nullif(p_kind, ''), 'committee')::core.org_kind, coalesce(nullif(p_level, ''), 'local')::core.org_level, parent, p_city, p_district, p_state, 'pending', auth.uid(), true)
  returning id into oid;
  insert into public.organization_settings(organization_id, organization_name, organization_name_hi, about_short, phone, whatsapp, email, city, district, state)
  values (oid, trim(p_name), nullif(trim(p_name_hi), ''), left(p_about, 500), p_phone, p_phone, p_email, p_city, p_district, p_state);
  -- requester becomes the organization's admin (effective once the organization is approved)
  select id into oa from core.roles where organization_id is null and key = 'org_admin';
  insert into core.role_assignments(organization_id, user_id, role_id) select oid, auth.uid(), oa where not exists (select 1 from core.role_assignments x where x.organization_id = oid and x.user_id = auth.uid() and x.role_id = oa);
  -- tell the platform admins
  perform public.k1_notify_org_admins(root, 'org.children.manage',
    '🏛️ नया संगठन पंजीकरण: ' || trim(p_name) || coalesce(' (' || p_city || ')', '') || E'\n' || 'द्वारा: ' || coalesce(p_contact_name, '') || ' ' || coalesce(p_phone, '') || E'\n' || 'मंज़ूरी: Admin → Organizations', 'organizations', oid);
  return jsonb_build_object('id', oid, 'slug', slug);
end $$;
grant execute on function public.k1_org_register(text, text, text, text, text, text, text, text, text, text, text, uuid) to authenticated;

-- platform admin (or parent's children.manage) decides
create or replace function public.k1_org_decide(p_org uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o core.organizations; base text;
begin
  select * into o from core.organizations where id = p_org;
  if o is null then raise exception 'Not found'; end if;
  if not (core.is_platform_admin() or (o.parent_id is not null and core.can(o.parent_id, 'org.children.manage'))) then raise exception 'Not allowed'; end if;
  perform set_config('k1.register', '1', true);
  if p_approve then
    update core.organizations set status = 'active' where id = p_org;
    base := (select d.hostname from core.org_domains d join core.organizations r on r.id = d.organization_id where r.slug = 'kalchuri-one' and d.is_primary limit 1);
    insert into core.org_domains(organization_id, hostname, kind, is_primary, verified_at) values (p_org, o.slug || '.' || coalesce(base, 'kalchuri.org'), 'subdomain', true, now()) on conflict (hostname) do nothing;
    insert into public.homepage_sections(organization_id, section_key, title, title_hi, display_order, active)
    select p_org, x.k, x.t, x.th, x.o, true from (values ('hero','Hero','मुख्य',1), ('news','News','समाचार',2), ('campaigns','Campaigns','अभियान',3), ('contact','Contact','संपर्क',4)) x(k,t,th,o)
    where not exists (select 1 from public.homepage_sections h where h.organization_id = p_org);
    update core.organizations set branding = branding || '{"modules": {"library": false, "bhojan": false, "donate": false}}'::jsonb where id = p_org;
    perform public.k1_notify_org_admins(p_org, 'org.settings.edit', '✅ आपका संगठन "' || o.name || '" Kalchuri One पर स्वीकृत हो गया। साइट: https://' || o.slug || '.' || coalesce(base, 'kalchuri.org') || E'\n' || 'Admin पैनल से logo, होम पेज, पदाधिकारी और सदस्यता सेट करें।', 'organizations', p_org);
  else
    update core.organizations set status = 'suspended' where id = p_org;
  end if;
  insert into core.audit_log(organization_id, actor_id, table_schema, table_name, row_id, action, new_data) values (p_org, auth.uid(), 'core', 'organizations', p_org::text, case when p_approve then 'approve' else 'reject' end, jsonb_build_object('note', p_note));
end $$;
grant execute on function public.k1_org_decide(uuid, boolean, text) to authenticated;

-- organizations list for the platform / umbrella admin
create or replace function public.k1_org_list()
returns table (id uuid, slug text, name text, name_hi text, kind text, level text, city text, district text, state text, status text, parent_id uuid, parent_name text, hostname text, members bigint, admins text, created_at timestamptz, requester text, phone text)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.kind::text, o.level::text, o.city, o.district, o.state, o.status::text, o.parent_id,
         (select p.name from core.organizations p where p.id = o.parent_id),
         (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1),
         (select count(*) from public.org_memberships m where m.organization_id = o.id and m.status = 'active'),
         (select string_agg(coalesce(sp.full_name, pr.full_name, u.email), ', ') from core.role_assignments ra join core.roles r on r.id = ra.role_id left join public.site_profiles sp on sp.id = ra.user_id left join public.profiles pr on pr.id = ra.user_id left join auth.users u on u.id = ra.user_id where ra.organization_id = o.id and r.key = 'org_admin'),
         o.created_at,
         (select coalesce(sp.full_name, pr.full_name, u.email) from auth.users u left join public.site_profiles sp on sp.id = u.id left join public.profiles pr on pr.id = u.id where u.id = o.created_by),
         (select s.phone from public.organization_settings s where s.organization_id = o.id)
    from core.organizations o
   where core.is_platform_admin() or exists (select 1 from core.org_tree t where t.descendant_id = o.id and t.depth >= 1 and core.can(t.ancestor_id, 'org.children.manage'))
   order by o.status = 'pending' desc, o.created_at desc;
$$;
grant execute on function public.k1_org_list() to authenticated;

-- every member of every organization under p_org (umbrella admin view)
create or replace function public.k1_network_members(p_org uuid, p_q text default null, p_limit int default 500)
returns table (id uuid, organization_id uuid, org_name text, org_slug text, member_no text, full_name text, mobile text, village text, city text, status text, category text, family_id uuid, applied_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.organization_id, o.name, o.slug, m.member_no, m.full_name, m.mobile, m.village, m.city, m.status, m.category, m.family_id, m.applied_at
    from public.org_memberships m join core.organizations o on o.id = m.organization_id
   where m.organization_id in (select t.descendant_id from core.org_tree t where t.ancestor_id = p_org)
     and (core.is_platform_admin() or core.can(p_org, 'org.oversee') or core.can(p_org, 'org.children.manage'))
     and (p_q is null or length(trim(p_q)) < 2 or m.full_name ilike '%' || trim(p_q) || '%' or m.mobile like '%' || trim(p_q) || '%' or o.name ilike '%' || trim(p_q) || '%')
   order by m.applied_at desc limit p_limit;
$$;
grant execute on function public.k1_network_members(uuid, text, int) to authenticated;

-- move a membership to another organization (e.g. registered under Kalchuri One before their samiti existed)
create or replace function public.k1_membership_move(p_id uuid, p_org uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.org_memberships;
begin
  select * into m from public.org_memberships where id = p_id;
  if m is null then raise exception 'Not found'; end if;
  if not (core.is_platform_admin() or (core.can(m.organization_id, 'org.member.approve') and core.can(p_org, 'org.member.approve'))) then raise exception 'Not allowed'; end if;
  if exists (select 1 from public.org_memberships x where x.organization_id = p_org and x.mobile = m.mobile and x.id <> p_id) then raise exception 'This mobile number is already a member there'; end if;
  update public.org_memberships set organization_id = p_org, member_no = null where id = p_id;
  insert into core.audit_log(organization_id, actor_id, table_schema, table_name, row_id, action, old_data, new_data) values (p_org, auth.uid(), 'public', 'org_memberships', p_id::text, 'move', jsonb_build_object('from', m.organization_id), jsonb_build_object('to', p_org));
end $$;
grant execute on function public.k1_membership_move(uuid, uuid) to authenticated;
