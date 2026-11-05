-- Kalchuri One · kalchuri.org = the umbrella organization "Kalchuri One" (was seeded as "Kalchuri Samaj");
-- Ekatm Kalar Yuva Manch stays a child organization at ekym.kalchuri.org with all its data untouched.
-- Members of any sub-organization count as members of the umbrella (so they can use the Kalchuri One feed).

update core.organizations
   set slug = 'kalchuri-one', name = 'Kalchuri One', name_hi = 'कलचुरी वन', short_name = 'Kalchuri One', kind = 'samaj', level = 'national', status = 'active'
 where slug = 'kalchuri-samaj';

-- settings + home page: copy from EKYM so the site is not empty; owner edits them in Admin → Organization settings / Pages
do $$
declare root uuid; ekym uuid; cols text; r record;
begin
  select id into root from core.organizations where slug = 'kalchuri-one';
  select id into ekym from core.organizations where slug = 'ekym';
  if not exists (select 1 from public.organization_settings where organization_id = root) then
    select string_agg(quote_ident(column_name), ',') into cols from information_schema.columns
     where table_schema = 'public' and table_name = 'organization_settings' and column_name not in ('id','organization_id','organization_name','tagline','about_short','footer_text','organization_name_hi','tagline_hi','about_short_hi','footer_text_hi','updated_by','updated_at','created_at');
    execute format('insert into public.organization_settings(organization_id, organization_name, tagline, about_short, footer_text, organization_name_hi, tagline_hi, about_short_hi, footer_text_hi, %s) select $1, $2, $3, $4, $5, $6, $7, $8, $9, %s from public.organization_settings where organization_id = $10', cols, cols)
      using root, 'Kalchuri One', 'One community, one platform', 'Kalchuri One is the shared digital platform of the Kalchuri community: organizations, members, family trees, publications, events and seva — in one place.', 'Kalchuri One — the shared platform of the Kalchuri community',
            'कलचुरी वन', 'एक समाज, एक मंच', 'कलचुरी वन कलचुरी समाज का साझा डिजिटल मंच है: संगठन, सदस्य, वंश वृक्ष, प्रकाशन, आयोजन और सेवा — सब एक जगह।', 'कलचुरी वन — कलचुरी समाज का साझा मंच', ekym;
  end if;
  for r in select * from (values ('homepage_sections'), ('homepage_slides'), ('festival_slides')) t(tbl) loop
    execute format('select count(*) from public.%I where organization_id = $1', r.tbl) into cols using root;
    if cols::int = 0 then
      select string_agg(quote_ident(column_name), ',') into cols from information_schema.columns
       where table_schema = 'public' and table_name = r.tbl and column_name not in ('id','organization_id','created_at','updated_at');
      execute format('insert into public.%I(organization_id, %s) select $1, %s from public.%I where organization_id = $2', r.tbl, cols, cols, r.tbl) using root, ekym;
    end if;
  end loop;
  -- hostnames
  insert into core.org_domains(organization_id, hostname, kind, is_primary, verified_at) values
    (root, 'kalchuri.org', 'custom', true, now()), (root, 'www.kalchuri.org', 'custom', false, now()), (ekym, 'ekym.kalchuri.org', 'subdomain', true, now())
  on conflict (hostname) do nothing;
end $$;

-- membership of a sub-organization counts for the umbrella
create or replace function public.k1_is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_org_team(p_org) or exists (
    select 1 from public.org_memberships m join core.org_tree t on t.descendant_id = m.organization_id
     where t.ancestor_id = p_org and m.user_id = auth.uid() and m.status = 'active');
$$;
