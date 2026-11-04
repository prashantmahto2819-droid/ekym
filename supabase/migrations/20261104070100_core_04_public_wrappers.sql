-- Public-schema wrappers so the app can call core functions through the default Data API
-- (schema `core` is not exposed over REST). Prefix k1_ = Kalchuri One.

create or replace function public.k1_resolve_host(p_host text)
returns table (organization_id uuid, slug text, name text, name_hi text, short_name text, branding jsonb)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.short_name, o.branding
    from core.org_domains d join core.organizations o on o.id = d.organization_id
   where d.hostname = lower(p_host) and o.status = 'active';
$$;

create or replace function public.k1_org_by_slug(p_slug text)
returns table (organization_id uuid, slug text, name text, name_hi text, short_name text, branding jsonb)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.short_name, o.branding
    from core.organizations o where o.slug = lower(p_slug) and o.status = 'active';
$$;

create or replace function public.k1_my_orgs()
returns table (organization_id uuid, slug text, name text, name_hi text, role_keys text[], permissions text[])
language sql stable security definer set search_path = '' as $$
  select m.organization_id, m.slug, m.name, m.name_hi, m.role_keys,
         case when core.is_platform_admin() then array['*']
              else (select array_agg(distinct p) from core.role_assignments ra
                      join core.roles r on r.id = ra.role_id, unnest(r.permissions) p
                     where ra.organization_id = m.organization_id and ra.user_id = auth.uid()
                       and (ra.valid_to is null or ra.valid_to >= current_date)) end
    from core.my_orgs() m;
$$;

create or replace function public.k1_can(p_org uuid, p_perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.can(p_org, p_perm);
$$;

create or replace function public.k1_is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin();
$$;

-- team of an organization (for the admin "Users" page); phone/email only for role managers
create or replace function public.k1_org_team(p_org uuid)
returns table (user_id uuid, full_name text, email text, mobile text, role_key text, role_name text, role_id uuid, assignment_id uuid)
language sql stable security definer set search_path = '' as $$
  select ra.user_id, coalesce(sp.full_name, p.full_name), sp.email, coalesce(sp.mobile, p.phone), r.key, r.name, r.id, ra.id
    from core.role_assignments ra
    join core.roles r on r.id = ra.role_id
    left join public.site_profiles sp on sp.id = ra.user_id
    left join public.profiles p on p.id = ra.user_id
   where ra.organization_id = p_org and core.can(p_org, 'org.roles.manage')
   order by r.name, 2;
$$;

create or replace function public.k1_org_roles(p_org uuid)
returns table (role_id uuid, key text, name text, name_hi text, permissions text[], is_system boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.key, r.name, r.name_hi, r.permissions, r.is_system
    from core.roles r where (r.organization_id is null or r.organization_id = p_org) and core.is_org_team(p_org)
   order by r.is_system desc, r.name;
$$;

-- assign a role by email (user must already have an account); guard trigger enforces rights
create or replace function public.k1_assign_role(p_org uuid, p_email text, p_role_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid; rid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null then raise exception 'No account found for %', p_email; end if;
  if not core.can(p_org, 'org.roles.manage') then raise exception 'Not allowed'; end if;
  insert into core.role_assignments(organization_id, user_id, role_id, created_by)
  values (p_org, uid, p_role_id, auth.uid())
  on conflict do nothing returning id into rid;
  return rid;
end $$;

create or replace function public.k1_remove_role(p_assignment uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select * into a from core.role_assignments where id = p_assignment;
  if a is null then return; end if;
  if not core.can(a.organization_id, 'org.roles.manage') then raise exception 'Not allowed'; end if;
  if a.user_id = auth.uid() and not core.is_platform_admin()
     and (select count(*) from core.role_assignments x join core.roles r on r.id = x.role_id
           where x.organization_id = a.organization_id and r.permissions && array['*']) <= 1 then
    raise exception 'The last admin cannot remove himself';
  end if;
  delete from core.role_assignments where id = p_assignment;
end $$;

revoke all on function public.k1_resolve_host(text), public.k1_org_by_slug(text), public.k1_my_orgs(), public.k1_can(uuid, text),
  public.k1_is_platform_admin(), public.k1_org_team(uuid), public.k1_org_roles(uuid), public.k1_assign_role(uuid, text, uuid),
  public.k1_remove_role(uuid) from public;
grant execute on function public.k1_resolve_host(text), public.k1_org_by_slug(text) to anon, authenticated, service_role;
grant execute on function public.k1_my_orgs(), public.k1_can(uuid, text), public.k1_is_platform_admin(), public.k1_org_team(uuid),
  public.k1_org_roles(uuid), public.k1_assign_role(uuid, text, uuid), public.k1_remove_role(uuid) to authenticated, service_role;
