drop function if exists public.k1_org_team(uuid);
create function public.k1_org_team(p_org uuid)
returns table (user_id uuid, full_name text, email text, mobile text, role_key text, role_name text, role_id uuid, assignment_id uuid, regions text[], valid_to date)
language sql stable security definer set search_path = '' as $$
  select ra.user_id, coalesce(sp.full_name, p.full_name, m.full_name), coalesce(sp.email, m.email), coalesce(sp.mobile, p.phone, m.mobile), r.key, coalesce(r.name_hi, r.name), r.id, ra.id,
         (select array_agg(sr.name order by sr.sort_order) from public.social_regions sr where sr.id = any(ra.regions)), ra.valid_to
    from core.role_assignments ra
    join core.roles r on r.id = ra.role_id
    left join public.site_profiles sp on sp.id = ra.user_id
    left join public.profiles p on p.id = ra.user_id
    left join lateral (select om.full_name, om.email, om.mobile from public.org_memberships om where om.user_id = ra.user_id and om.status = 'active' order by om.decided_at desc nulls last limit 1) m on true
   where ra.organization_id = p_org and core.can(p_org, 'org.roles.manage')
   order by r.name, 2;
$$;
grant execute on function public.k1_org_team(uuid) to authenticated;
