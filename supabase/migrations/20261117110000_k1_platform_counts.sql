-- Kalchuri One मुख्य साइट के होम पेज के लिए पूरे मंच की गिनती (सिर्फ़ संख्याएँ, कोई नाम नहीं)
create or replace function public.k1_platform_counts()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'orgs', (select count(*) from core.organizations o where o.parent_id is not null and o.status = 'active'),
    'members', (select count(*) from public.org_memberships m where m.status = 'active'),
    'families', (select count(*) from public.families f where f.status = 'approved' and f.kind = 'tree'),
    'people', (select count(*) from public.members x join public.families f on f.id = x.family_id where f.status = 'approved' and f.kind = 'tree'),
    'events', (select count(*) from public.ev_events e where e.status in ('published', 'done')),
    'donors', (select count(*) from public.blood_donors b));
$$;
revoke all on function public.k1_platform_counts() from public;
grant execute on function public.k1_platform_counts() to anon, authenticated;
