-- Team & roles: find an account by name / mobile / email (not only exact email), then assign the role by user id.
create or replace function public.k1_find_users(p_org uuid, p_q text, p_limit int default 20)
returns table (user_id uuid, full_name text, email text, mobile text, village text, source text, roles text[])
language sql stable security definer set search_path = '' as $$
  with q as (select lower(trim(p_q)) t, regexp_replace(p_q, '\D', '', 'g') d),
  people as (
    select u.id, coalesce(sp.full_name, pr.full_name, m.full_name, u.raw_user_meta_data->>'full_name') full_name,
           coalesce(u.email, sp.email, m.email) email,
           coalesce(sp.mobile, pr.phone, m.mobile, u.phone) mobile,
           coalesce(m.village, pr.village, sp.city) village,
           case when m.id is not null then 'सदस्य' when pr.id is not null then 'शोकपत्र' else 'खाता' end source
    from auth.users u
    left join public.site_profiles sp on sp.id = u.id
    left join public.profiles pr on pr.id = u.id
    left join lateral (select * from public.org_memberships om where om.user_id = u.id order by om.status = 'active' desc, om.applied_at desc limit 1) m on true
  )
  select p.id, p.full_name, p.email, p.mobile, p.village, p.source,
         (select array_agg(r.name_hi) from core.role_assignments ra join core.roles r on r.id = ra.role_id where ra.user_id = p.id and ra.organization_id = p_org)
  from people p, q
  where core.can(p_org, 'org.roles.manage') and length(q.t) >= 2 and (
        lower(coalesce(p.full_name,'')) like '%' || q.t || '%'
     or lower(coalesce(p.email,'')) like '%' || q.t || '%'
     or (length(q.d) >= 4 and regexp_replace(coalesce(p.mobile,''), '\D', '', 'g') like '%' || q.d || '%'))
  order by p.full_name nulls last limit least(p_limit, 50);
$$;
grant execute on function public.k1_find_users(uuid, text, int) to authenticated;

create or replace function public.k1_assign_role_user(p_org uuid, p_user uuid, p_role_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if not core.can(p_org, 'org.roles.manage') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'No such account'; end if;
  insert into core.role_assignments(organization_id, user_id, role_id, created_by)
  values (p_org, p_user, p_role_id, auth.uid()) on conflict do nothing returning id into rid;
  return rid;
end $$;
grant execute on function public.k1_assign_role_user(uuid, uuid, uuid) to authenticated;
