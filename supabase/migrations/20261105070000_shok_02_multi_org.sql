-- Kalchuri One · shokpatra becomes multi-organization (additive; shokpatra app unchanged except server-side filters):
-- every family belongs to an organization (default: प्रगतिशील जायसवाल कन्नौजिया कलार समाज, which owns the existing data);
-- a signed-in user works inside their organization (active membership / family.manage role / platform admin = all);
-- directory, village stats, dashboard and letters are scoped to that organization; letters carry organization_id so the
-- send worker can use the organization's own WhatsApp gateway (Kalchuri One → Admin → Messaging), falling back to app_settings.

alter table public.families add column if not exists organization_id uuid references core.organizations(id) on delete set null;
create index if not exists families_org_idx on public.families(organization_id);
update public.families set organization_id = (select id from core.organizations where slug = 'pragatishil-kalar-samaj') where organization_id is null;

-- the organization a shokpatra user works in
create or replace function public.shok_user_org()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.organization_id from public.org_memberships m where m.user_id = auth.uid() and m.status = 'active' order by m.decided_at desc nulls last limit 1),
    (select o from core.orgs_with_perm(auth.uid(), 'family.manage') o limit 1),
    (select id from core.organizations where slug = 'pragatishil-kalar-samaj'));
$$;
grant execute on function public.shok_user_org() to authenticated;

-- may this user see data of organization p_org inside shokpatra? platform admins / shokpatra super admin: everything
create or replace function public.shok_sees_org(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_org is null
      or core.is_platform_admin()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.super_admin)
      or p_org = public.shok_user_org()
      or core.can(p_org, 'family.manage');
$$;
grant execute on function public.shok_sees_org(uuid) to authenticated;

-- new families / letters get the user's organization
create or replace function public.trg_shok_set_org() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is null then new.organization_id := public.shok_user_org(); end if;
  return new;
end $$;
create trigger trg_families_org before insert on public.families for each row execute function public.trg_shok_set_org();
create trigger trg_letters_org before insert on public.letters for each row execute function public.trg_shok_set_org();

-- organization-level family admins (Kalchuri One role family_admin / org_admin in the family's organization)
create or replace function public.admin_can_manage_family(p_admin uuid, p_family uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles me where me.id = p_admin and me.role = 'admin' and me.status = 'approved' and (
    me.super_admin or me.admin_scope = 'all'
    or exists (select 1 from public.families f where f.id = p_family and (f.owner_id = me.id
         or exists (select 1 from public.admin_villages av where av.admin_id = me.id and av.village_id = f.village_id)))
    or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
         join public.admin_regions ar on ar.region_id = ov.region_id and ar.admin_id = me.id where m.family_id = p_family)))
  or exists (select 1 from core.platform_admins pa where pa.user_id = p_admin)
  or exists (select 1 from public.families f where f.id = p_family and f.organization_id in (select core.orgs_with_perm(p_admin, 'family.manage')))
  or exists (select 1 from core.organizations o
              where o.id in (select core.orgs_with_perm(p_admin, 'family.manage'))
                and o.status = 'active'
                and o.social_region_id is not null
                and exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                             where m.family_id = p_family and ov.region_id = o.social_region_id));
$$;

-- shokpatra "admin" = shokpatra admin profile OR anyone with family.manage somewhere
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status = 'approved')
      or core.has_perm_anywhere('family.manage');
$$;

-- scoped read functions (same signatures; only the organization filter added)
create or replace function public.directory_families(p_village uuid default null)
returns table (id uuid, family_name text, village_id uuid, village_name text, head_name text)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  return query
    select f.id, f.family_name, f.village_id, v.name,
           (select m.name from public.members m where m.family_id = f.id and m.is_head limit 1)
    from public.families f left join public.villages v on v.id = f.village_id
    where f.status = 'approved' and (p_village is null or f.village_id = p_village) and public.shok_sees_org(f.organization_id)
    order by f.family_name limit 500;
end $$;

create or replace function public.directory_members(p_village uuid default null)
returns table (member_id uuid, family_id uuid, family_name text, member_name text, relation text, father_name text, village_id uuid, village_name text, is_head boolean, has_phone boolean, native_place text, lineage_id uuid, member_kind text, parent_deceased boolean, region_id uuid, region_name text, region_sort integer)
language sql stable security definer set search_path = 'public' as $$
  select m.id, f.id, f.family_name, m.name, m.relation, par.name,
         coalesce(m.village_id, f.village_id), v.name, m.is_head,
         (coalesce(m.phone, '') <> ''), m.native_place, coalesce(lr.root_id, f.id), m.member_kind, coalesce(par.is_deceased, false),
         sr.id, sr.name, sr.sort_order
  from public.members m
  join public.families f on f.id = m.family_id and f.status = 'approved'
  left join public.members par on par.id = m.parent_id
  left join public.villages v on v.id = coalesce(m.village_id, f.village_id)
  left join public.lineage_roots() lr on lr.family_id = f.id
  left join public.origin_villages ov on ov.id = m.origin_village_id
  left join public.social_regions sr on sr.id = ov.region_id
  where public.is_approved() and not m.is_deceased and not m.name_unknown
    and public.shok_sees_org(f.organization_id)
    and (p_village is null or coalesce(m.village_id, f.village_id) = p_village)
  order by v.name nulls last, f.family_name, m.is_head desc, m.sort_order, m.created_at;
$$;

create or replace function public.village_stats()
returns table (village_id uuid, village_name text, families bigint, members bigint)
language sql stable security definer set search_path = 'public' as $$
  select v.id, v.name, count(distinct m.family_id), count(m.id)
  from public.villages v
  left join (
    select mm.id, mm.family_id, coalesce(mm.village_id, f.village_id) as vid
    from public.members mm join public.families f on f.id = mm.family_id and f.status = 'approved' and public.shok_sees_org(f.organization_id)
  ) m on m.vid = v.id
  where public.is_approved()
  group by v.id, v.name
  having count(m.id) > 0 or public.is_admin()
  order by count(m.id) desc, v.name;
$$;

-- families RLS: members of the same organization may read approved families of their organization (directory already does)
-- letters: the organization's family admins see its letters
create policy letters_org_admin_read on public.letters for select to authenticated using (organization_id is not null and core.can(organization_id, 'family.manage'));
