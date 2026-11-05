-- Kalchuri One · Phase 15 · platform concept on the site:
-- modules switch per organization (branding.modules), bhojan seva removed, umbrella home shows the network
-- (member organizations + their activities), contact routed to an organization + WhatsApp alert,
-- internship → research & internship (Kalchuri history), membership form carries volunteer interest + family-tree link.

-- ---------- modules: library off everywhere (switch in Admin → Organization settings) ----------
update core.organizations set branding = branding || jsonb_build_object('modules', coalesce(branding->'modules', '{}'::jsonb) || '{"library": false, "bhojan": false}'::jsonb) where slug in ('kalchuri-one','ekym');
update public.homepage_sections set active = false where section_key = 'bhojan';
update public.seva_projects set active = false where slug = 'bhojan' or lower(name) like '%bhojan%';

-- ---------- umbrella home sections ----------
do $$ declare root uuid; begin
  select id into root from core.organizations where slug = 'kalchuri-one';
  if root is not null and not exists (select 1 from public.homepage_sections where organization_id = root and section_key = 'network') then
    update public.homepage_sections set display_order = display_order + 2 where organization_id = root and display_order >= 4;
    insert into public.homepage_sections(organization_id, section_key, title, title_hi, subtitle, subtitle_hi, display_order, active) values
      (root, 'network', 'Our organizations', 'हमारी संस्थाएँ', 'Samitis and sansthas of the community on this platform', 'इस मंच पर समाज की समितियाँ और संस्थाएँ', 4, true),
      (root, 'activities', 'Community activities', 'समाज की गतिविधियाँ', 'Events, news and campaigns from every organization', 'सभी संस्थाओं के आयोजन, समाचार और अभियान', 5, true);
  end if;
end $$;

-- network feed: child organizations + their public activity (anon)
create or replace function public.k1_network(p_org uuid, p_limit int default 12)
returns jsonb language sql stable security definer set search_path = '' as $$
  with subtree as (select descendant_id id from core.org_tree where ancestor_id = p_org and depth >= 1),
  orgs as (
    select o.id, o.slug, o.name, o.name_hi, o.short_name, o.kind, o.level, o.city, o.district, o.state, o.branding,
           (select s.logo from public.organization_settings s where s.organization_id = o.id) logo,
           (select s.tagline from public.organization_settings s where s.organization_id = o.id) tagline,
           (select s.tagline_hi from public.organization_settings s where s.organization_id = o.id) tagline_hi,
           coalesce((select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1), null) hostname,
           (select count(*) from public.org_memberships m where m.organization_id = o.id and m.status = 'active') members,
           (select count(*) from public.ev_events e where e.organization_id = o.id and e.status in ('published','done')) events
      from core.organizations o where o.id in (select id from subtree) and o.status = 'active' order by o.level, o.name)
  select jsonb_build_object(
    'orgs', coalesce((select jsonb_agg(to_jsonb(orgs)) from orgs), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'slug', e.slug, 'title', e.title, 'title_hi', e.title_hi, 'starts_at', e.starts_at, 'venue', e.venue, 'cover_image', e.cover_image, 'org', o.name, 'org_hi', o.name_hi, 'org_slug', o.slug, 'hostname', (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1)) order by e.starts_at)
                        from (select * from public.ev_events e where e.organization_id in (select id from subtree) and e.status = 'published' and e.starts_at > now() - interval '1 day' order by e.starts_at limit p_limit) e join core.organizations o on o.id = e.organization_id), '[]'::jsonb),
    'news', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'slug', n.slug, 'title', n.title, 'title_hi', n.title_hi, 'thumbnail', n.thumbnail, 'published_at', n.published_at, 'org', o.name, 'org_hi', o.name_hi, 'org_slug', o.slug, 'hostname', (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1)) order by n.published_at desc)
                        from (select * from public.news n where n.organization_id in (select id from subtree) and n.status = 'published' order by n.published_at desc nulls last limit p_limit) n join core.organizations o on o.id = n.organization_id), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'title_hi', c.title_hi, 'cover_image', c.cover_image, 'target_amount', c.target_amount, 'raised_amount', c.raised_amount, 'org', o.name, 'org_hi', o.name_hi, 'org_slug', o.slug, 'hostname', (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1)) order by c.created_at desc)
                        from (select * from public.campaigns c where c.organization_id in (select id from subtree) and c.status = 'published' order by c.created_at desc limit p_limit) c join core.organizations o on o.id = c.organization_id), '[]'::jsonb),
    'seva', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'slug', s.slug, 'name', s.name, 'name_hi', s.name_hi, 'short_description', s.short_description, 'short_description_hi', s.short_description_hi, 'featured_image', s.featured_image, 'icon', s.icon, 'org', o.name, 'org_hi', o.name_hi, 'org_slug', o.slug, 'hostname', (select d.hostname from core.org_domains d where d.organization_id = o.id and d.verified_at is not null order by d.is_primary desc limit 1)) order by o.name, s.display_order)
                        from public.seva_projects s join core.organizations o on o.id = s.organization_id where s.organization_id in (select id from subtree) and s.active), '[]'::jsonb));
$$;
grant execute on function public.k1_network(uuid, int) to anon, authenticated;

-- ---------- generic admin alert (WhatsApp to everyone with a permission in the org + org number) ----------
create or replace function public.k1_notify_org_admins(p_org uuid, p_perm text, p_body text, p_ref_table text default null, p_ref uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare ch uuid; n int := 0; r record;
begin
  ch := public.k1_pick_channel(p_org, 'whatsapp');
  if ch is null then return 0; end if;
  for r in
    select distinct public.k1_norm_contact(x.phone) phone, x.name from (
        select coalesce(sp.mobile, pr.phone) phone, coalesce(sp.full_name, pr.full_name) name
          from core.role_assignments ra join core.roles ro on ro.id = ra.role_id
          left join public.site_profiles sp on sp.id = ra.user_id left join public.profiles pr on pr.id = ra.user_id
         where ra.organization_id = p_org and (ra.valid_to is null or ra.valid_to >= current_date)
           and ro.permissions && array['*', split_part(p_perm, '.', 1) || '.*', p_perm]
        union all
        select os.whatsapp, os.organization_name from public.organization_settings os where os.organization_id = p_org
      ) x where x.phone is not null and x.phone <> ''
  loop
    if r.phone ~ '^[0-9]{11,13}$' then
      insert into public.comms_messages(organization_id, channel_id, kind, purpose, to_contact, to_name, body, ref_table, ref_id)
      values (p_org, ch, 'whatsapp', 'utility', r.phone, r.name, p_body, p_ref_table, p_ref);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_notify_org_admins(uuid, text, text, text, uuid) from public, anon, authenticated;

-- ---------- contact: topic + organization + alert ----------
alter table public.contact_messages add column if not exists topic text;
create or replace function public.trg_contact_alert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is not null then
    perform public.k1_notify_org_admins(new.organization_id, 'community.messages.manage',
      '📩 नया संपर्क संदेश (' || coalesce(new.topic, 'अन्य') || ')' || E'\n' || 'नाम: ' || new.name || coalesce(E'\n' || 'मोबाइल: ' || new.mobile, '') || E'\n' || left(new.message, 300) || E'\n' || 'Admin → Contact inbox', 'contact_messages', new.id);
  end if;
  return new;
end $$;
create trigger trg_contact_alert after insert on public.contact_messages for each row execute function public.trg_contact_alert();
-- public list of organizations a visitor can write to (umbrella + children)
create or replace function public.k1_contact_targets(p_org uuid)
returns table (id uuid, name text, name_hi text) language sql stable security definer set search_path = '' as $$
  select o.id, o.name, o.name_hi from core.organizations o join core.org_tree t on t.descendant_id = o.id
   where t.ancestor_id = p_org and o.status = 'active' order by t.depth, o.name;
$$;
grant execute on function public.k1_contact_targets(uuid) to anon, authenticated;

-- ---------- internship → research & internship (Kalchuri history) ----------
alter table public.internship_programs
  add column if not exists kind text not null default 'internship' check (kind in ('internship','research')),
  add column if not exists theme text,                 -- history | genealogy | village | culture | other
  add column if not exists name_hi text, add column if not exists description_hi text;
alter table public.intern_applications
  add column if not exists research_topic text, add column if not exists proposal text, add column if not exists expected_output text;

-- ---------- membership: volunteer interest + family tree link ----------
alter table public.org_memberships
  add column if not exists volunteer jsonb not null default '{}'::jsonb,   -- {interested, areas[], availability, skills}
  add column if not exists family_id uuid references public.families(id) on delete set null,
  add column if not exists native_place text;
create index if not exists org_memberships_family_idx on public.org_memberships(family_id);
-- (net_02) applicant's own note about the family tree; the admin links family_id after approval
alter table public.org_memberships add column if not exists family_head_name text, add column if not exists in_family_tree boolean;
