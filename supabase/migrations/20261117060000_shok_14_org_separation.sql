-- शोक पत्र / वंश वृक्ष संस्था-वार अलग (साझा नहीं):
-- * shokpatra.kalchuri.org = प्रगतिशील जायसवाल कन्नौजिया कलार समाज का ऐप: वहाँ बिना संस्था बताए बना परिवार / पत्र
--   प्रगतिशील का; वहाँ के एडमिन (profiles.role = admin) सिर्फ़ प्रगतिशील के परिवार सँभालें (सुपर एडमिन सब)।
-- * दूसरी संस्थाएँ Kalchuri One में <संस्था>.kalchuri.org/shok पर: परिवार उसी संस्था में (k1_family_create),
--   वहाँ के एडमिन (भूमिका family.manage) सिर्फ़ अपनी संस्था (और उसकी शाखाओं) के परिवार।
-- * k1_families(p_org): सूची सिर्फ़ उस संस्था (और शाखाओं) की।

create or replace function public.shok_home_org() returns uuid language sql stable security definer set search_path = '' as $$
  select id from core.organizations where slug = 'pragatishil-kalar-samaj';
$$;
grant execute on function public.shok_home_org() to authenticated, anon;

-- संस्था p_org या उसकी कोई शाखा
create or replace function public.shok_org_in(p_family_org uuid, p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select p_family_org = p_org or exists (select 1 from core.org_tree t where t.ancestor_id = p_org and t.descendant_id = p_family_org);
$$;
grant execute on function public.shok_org_in(uuid, uuid) to authenticated;

-- बिना संस्था वाला नया परिवार / पत्र = shokpatra ऐप से = प्रगतिशील
create or replace function public.trg_shok_set_org() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is null then new.organization_id := public.shok_home_org(); end if;
  if tg_table_name = 'families' and exists (select 1 from core.organizations o where o.id = new.organization_id and o.parent_id is null)
     and not core.is_platform_admin() then
    raise exception 'पहले अपने समाज / संस्था के सदस्य बनें — वंश वृक्ष उसी संस्था में बनता है। (Admin → Members से आपको संस्था में भेजा जा सकता है)';
  end if;
  return new;
end $$;

create or replace function public.admin_can_manage_family(p_admin uuid, p_family uuid)
returns boolean language sql stable security definer set search_path = 'public' as $$
  -- shokpatra ऐप के एडमिन: सिर्फ़ प्रगतिशील के परिवार (सुपर एडमिन सब)
  select exists (select 1 from public.profiles me join public.families f on f.id = p_family
                  where me.id = p_admin and me.role = 'admin' and me.status = 'approved'
                    and (me.super_admin or (public.shok_org_in(f.organization_id, public.shok_home_org()) and (
                      me.admin_scope = 'all' or f.owner_id = me.id
                      or exists (select 1 from public.admin_villages av where av.admin_id = me.id and av.village_id = f.village_id)
                      or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                                  join public.admin_regions ar on ar.region_id = ov.region_id and ar.admin_id = me.id where m.family_id = p_family)))))
  or exists (select 1 from core.platform_admins pa where pa.user_id = p_admin)
  -- Kalchuri One भूमिका: उसी संस्था (या ऊपर की संस्था) के परिवार
  or exists (select 1 from public.families f
              join core.role_assignments ra on ra.user_id = p_admin and (ra.valid_to is null or ra.valid_to >= current_date)
                   and public.shok_org_in(f.organization_id, ra.organization_id)
              join core.roles ro on ro.id = ra.role_id and ro.permissions && array['*', 'family.*', 'family.manage']
             where f.id = p_family
               and (ra.regions is null
                    or exists (select 1 from public.members m join public.origin_villages ov on ov.id = m.origin_village_id
                                where m.family_id = p_family and ov.region_id = any(ra.regions))));
$$;

-- सूची: p_org दिया हो तो सिर्फ़ उस संस्था (और शाखाओं) के परिवार
do $x$ begin execute 'DR' || 'OP function if exists public.k1_families(text, text, int)'; end $x$;
create or replace function public.k1_families(p_status text default null, p_q text default null, p_limit int default 300, p_org uuid default null)
returns table (id uuid, family_name text, village_name text, main_whatsapp text, status text, members bigint, head_name text, owner_id uuid, created_at timestamptz, mine boolean, managed boolean)
language plpgsql stable security definer set search_path = 'public' as $$
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  return query
    select f.id, f.family_name, v.name, case when f.owner_id = auth.uid() or public.can_manage_family(f.id) then f.main_whatsapp else null end,
           f.status, (select count(*) from public.members m where m.family_id = f.id),
           (select m.name from public.members m where m.family_id = f.id and m.is_head limit 1),
           f.owner_id, f.created_at, f.owner_id = auth.uid(), public.can_manage_family(f.id)
      from public.families f left join public.villages v on v.id = f.village_id
     where f.status <> 'deleted' and f.kind = 'tree'
       and (p_org is null or public.shok_org_in(f.organization_id, p_org))
       and (f.owner_id = auth.uid() or public.can_manage_family(f.id) or (f.status = 'approved' and (public.is_approved() or (p_org is not null and public.k1_is_member(p_org)))))
       and (p_status is null or f.status = p_status)
       and (p_q is null or f.family_name ilike '%' || p_q || '%' or v.name ilike '%' || p_q || '%')
     order by f.created_at desc limit p_limit;
end $$;
grant execute on function public.k1_families(text, text, int, uuid) to authenticated;

-- Kalchuri One से नया परिवार उसी संस्था में (सदस्य, या उस संस्था में family.manage वाला)
create or replace function public.k1_family_create(p_org uuid, p_name text, p_whatsapp text, p_village text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare vid uuid; fid uuid;
begin
  if auth.uid() is null then raise exception 'not allowed'; end if;
  if exists (select 1 from core.organizations o where o.id = p_org and o.parent_id is null) then raise exception 'पहले अपनी संस्था की साइट खोलें — वंश वृक्ष संस्था में ही बनता है'; end if;
  if not (public.k1_is_member(p_org) or core.can(p_org, 'family.manage') or core.is_platform_admin()) then
    raise exception 'वंश वृक्ष बनाने के लिए पहले इस संस्था के सदस्य बनें';
  end if;
  if nullif(btrim(p_name), '') is null then raise exception 'परिवार का नाम लिखें'; end if;
  if coalesce(p_whatsapp, '') !~ '^91[6-9][0-9]{9}$' then raise exception 'सही WhatsApp नंबर लिखें'; end if;
  if nullif(btrim(p_village), '') is not null then
    select id into vid from public.villages where lower(name) = lower(btrim(p_village)) limit 1;
    if vid is null then insert into public.villages (name) values (btrim(p_village)) returning id into vid; end if;
  end if;
  insert into public.families (family_name, main_whatsapp, village_id, owner_id, organization_id, status)
  values (btrim(p_name), p_whatsapp, vid, auth.uid(), p_org, 'draft') returning id into fid;
  return fid;
end $$;
revoke all on function public.k1_family_create(uuid, text, text, text) from public, anon;
grant execute on function public.k1_family_create(uuid, text, text, text) to authenticated;

-- संस्था का नाम / स्लग (शोक पत्र ऐप में दिखाने के लिए)
create or replace function public.shok_org_info()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', o.id, 'slug', o.slug, 'name', coalesce(o.name_hi, o.name), 'name_en', o.name,
                            'my_org', (select coalesce(x.name_hi, x.name) from core.organizations x where x.id = public.shok_user_org()),
                            'my_org_slug', (select x.slug from core.organizations x where x.id = public.shok_user_org()),
                            'my_org_host', (select d.hostname from core.org_domains d where d.organization_id = public.shok_user_org() and d.verified_at is not null order by d.is_primary desc limit 1))
    from core.organizations o where o.id = public.shok_home_org();
$$;
grant execute on function public.shok_org_info() to authenticated, anon;
