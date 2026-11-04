-- Family tree bridge: lets Kalchuri One organization teams use the shokpatra family data
-- through the existing shokpatra RPCs/RLS. Additive only; shokpatra keeps working unchanged
-- for its own users (profiles.role/status/admin_scope/admin_regions).
--
-- Rules
--   * family.manage (or family.*, *) in ANY organization  → counts as an approved shokpatra user (read directory/trees).
--   * family.manage in an org WITH social_region_id        → manage families whose members' origin village is in that region
--     (same as a shokpatra region admin).
--   * family.manage in an org WITHOUT social_region_id     → manage all families (national-level organization).
--   * platform admins → everything.

-- the permission held anywhere (active assignment)
create or replace function core.has_perm_anywhere(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1 from core.role_assignments ra join core.roles r on r.id = ra.role_id
     where ra.user_id = auth.uid()
       and (ra.valid_from is null or ra.valid_from <= current_date)
       and (ra.valid_to is null or ra.valid_to >= current_date)
       and (r.permissions && array['*', perm, split_part(perm, '.', 1) || '.*']));
$$;

-- organizations where the user holds a permission (for region scoping)
create or replace function core.orgs_with_perm(p_user uuid, perm text)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct ra.organization_id from core.role_assignments ra join core.roles r on r.id = ra.role_id
   where ra.user_id = p_user
     and (ra.valid_from is null or ra.valid_from <= current_date)
     and (ra.valid_to is null or ra.valid_to >= current_date)
     and (r.permissions && array['*', perm, split_part(perm, '.', 1) || '.*']);
$$;

-- shokpatra gate: approved profile OR Kalchuri One family permission
create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
      or core.has_perm_anywhere('family.manage');
$$;

-- admin scope: shokpatra rules + Kalchuri One organization rules
create or replace function public.admin_can_manage_family(p_admin uuid, p_family uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles me where me.id = p_admin and me.role = 'admin' and me.status = 'approved' and (
    me.super_admin or me.admin_scope = 'all'
    or exists (select 1 from public.families f where f.id = p_family and (f.owner_id = me.id
         or exists (select 1 from public.admin_villages av where av.admin_id = me.id and av.village_id = f.village_id)))
    or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
         join public.admin_regions ar on ar.region_id = ov.region_id and ar.admin_id = me.id where m.family_id = p_family)))
  or exists (select 1 from core.platform_admins pa where pa.user_id = p_admin)
  or exists (select 1 from core.organizations o
              where o.id in (select core.orgs_with_perm(p_admin, 'family.manage'))
                and o.status = 'active'
                and (o.social_region_id is null
                     or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                                 where m.family_id = p_family and ov.region_id = o.social_region_id)));
$$;

-- what the React app needs to decide the UI (one call)
create or replace function public.k1_family_ctx()
returns jsonb language sql stable security definer set search_path = 'public' as $$
  select jsonb_build_object(
    'approved', public.is_approved(),
    'shok_admin', public.is_admin(),
    'super', coalesce((select super_admin from public.profiles where id = auth.uid()), false),
    'platform_admin', core.is_platform_admin(),
    'family_manage', core.has_perm_anywhere('family.manage'),
    'shok_send', core.has_perm_anywhere('shok.send') or public.is_admin(),
    'profile_status', (select status from public.profiles where id = auth.uid()));
$$;
grant execute on function public.k1_family_ctx() to authenticated;

-- families visible to the caller as "mine or managed", with counts (for the Kalchuri One list page)
create or replace function public.k1_families(p_status text default null, p_q text default null, p_limit int default 300)
returns table (id uuid, family_name text, village_name text, main_whatsapp text, status text, members bigint, head_name text, owner_id uuid, created_at timestamptz, mine boolean, managed boolean)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  return query
    select f.id, f.family_name, v.name, case when f.owner_id = auth.uid() or public.can_manage_family(f.id) then f.main_whatsapp else null end,
           f.status, (select count(*) from public.members m where m.family_id = f.id),
           (select m.name from public.members m where m.family_id = f.id and m.is_head limit 1),
           f.owner_id, f.created_at, f.owner_id = auth.uid(), public.can_manage_family(f.id)
      from public.families f left join public.villages v on v.id = f.village_id
     where f.status <> 'deleted'
       and (f.owner_id = auth.uid() or public.can_manage_family(f.id) or f.status = 'approved')
       and (p_status is null or f.status = p_status)
       and (p_q is null or f.family_name ilike '%' || p_q || '%' or v.name ilike '%' || p_q || '%')
     order by f.created_at desc limit p_limit;
end $$;
grant execute on function public.k1_families(text, text, int) to authenticated;

comment on function public.k1_families is 'Kalchuri One: family list = own + managed + approved (approved ones without phone unless managed)';
