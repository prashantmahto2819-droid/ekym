-- Public numbers for the About page ("हमारा परिवार"): only totals, no names. Additive.
create or replace function public.k1_public_counts(p_org uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'members', (select count(*) from public.org_memberships m where m.organization_id = p_org and m.status = 'active'),
    'families', (select count(*) from public.families f where f.organization_id = p_org and f.status = 'approved'),
    'people', (select count(*) from public.members x join public.families f on f.id = x.family_id where f.organization_id = p_org and f.status = 'approved'),
    'events', (select count(*) from public.ev_events e where e.organization_id = p_org and e.status in ('published', 'done')),
    'seva', (select count(*) from public.seva_projects s where s.organization_id = p_org and s.active),
    'donors', (select count(*) from public.blood_donors b where b.organization_id = p_org)
  )
$$;
revoke all on function public.k1_public_counts(uuid) from public;
grant execute on function public.k1_public_counts(uuid) to anon, authenticated;
