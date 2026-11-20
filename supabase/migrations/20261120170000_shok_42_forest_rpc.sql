-- "सभी वंश वृक्ष एक पन्ने पर" (Kalchuri One, हर संस्था के लिए): एक संस्था के सभी मंज़ूर वृक्ष एक बार में,
-- बिना मोबाइल नंबर / जन्म तिथि के; साथ में वंश-कड़ियाँ (परिवार → किस व्यक्ति के नीचे)।
create or replace function public.shok_forest(p_org uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  with fams as (
    select f.id, f.family_name, f.village_id from public.families f
     where public.is_approved() and f.status = 'approved' and f.kind = 'tree'
       and public.shok_org_in(f.organization_id, p_org) and public.shok_sees_org(f.organization_id)
  )
  select jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'parent_id', m.parent_id, 'name', m.name, 'is_head', m.is_head, 'sort_order', m.sort_order,
                  'is_deceased', m.is_deceased, 'name_unknown', m.name_unknown, 'member_kind', m.member_kind, 'native_place', m.native_place,
                  'village_name', (select v.name from public.villages v where v.id = coalesce(m.village_id, f.village_id)),
                  'family_id', f.id, 'family_name', f.family_name) order by f.family_name, m.sort_order, m.created_at)
                from fams f join public.members m on m.family_id = f.id), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(jsonb_build_object('child_family_id', l.child_family_id, 'parent_member_id', l.parent_member_id))
                from public.family_links l where l.status = 'approved' and l.child_family_id in (select id from fams)
                 and exists (select 1 from public.members pm where pm.id = l.parent_member_id and pm.family_id in (select id from fams))), '[]'::jsonb));
$$;
revoke all on function public.shok_forest(uuid) from public, anon;
grant execute on function public.shok_forest(uuid) to authenticated;
