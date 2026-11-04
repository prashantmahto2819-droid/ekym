-- Kalchuri One · Phase 2 · website tables become multi-organization.
-- Every website table gets organization_id (existing rows → EKYM), slugs become unique per organization,
-- and RLS checks permissions inside the row's own organization via core.can().
-- Additive: no table or row is removed; shokpatra tables are not touched.

do $$
declare
  ekym uuid := (select id from core.organizations where slug = 'ekym');
  t text;
  tables text[] := array[
    'organization_settings','homepage_sections','homepage_slides','festival_slides','seva_projects','contributors',
    'blogs','news','videos','reels','galleries','gallery_items','testimonials','contact_messages','campaigns',
    'media_library','blood_donors','blood_requirements','book_categories','books','students',
    'book_donation_requests','material_donation_requests','volunteer_applications','internship_programs',
    'intern_applications','donations','payment_transactions','donation_receipts','payment_settings'];
begin
  if ekym is null then raise exception 'EKYM organization missing'; end if;
  foreach t in array tables loop
    execute format('alter table public.%I add column organization_id uuid references core.organizations(id) on delete restrict', t);
    execute format('update public.%I set organization_id = %L', t, ekym);
    execute format('alter table public.%I alter column organization_id set not null', t);
    execute format('create index %I on public.%I(organization_id)', t || '_org_idx', t);
  end loop;
  -- webhook events arrive before we know the org; nullable
  alter table public.payment_webhook_events add column organization_id uuid references core.organizations(id) on delete set null;
end $$;

-- slugs / keys unique per organization
alter table public.homepage_sections drop constraint homepage_sections_section_key_key,
  add constraint homepage_sections_org_key unique (organization_id, section_key);
alter table public.seva_projects drop constraint seva_projects_slug_key, add constraint seva_projects_org_slug unique (organization_id, slug);
alter table public.blogs drop constraint blogs_slug_key, add constraint blogs_org_slug unique (organization_id, slug);
alter table public.news drop constraint news_slug_key, add constraint news_org_slug unique (organization_id, slug);
alter table public.galleries drop constraint galleries_slug_key, add constraint galleries_org_slug unique (organization_id, slug);
alter table public.campaigns drop constraint campaigns_slug_key, add constraint campaigns_org_slug unique (organization_id, slug);
alter table public.book_categories drop constraint book_categories_name_key, drop constraint book_categories_slug_key,
  add constraint book_categories_org_name unique (organization_id, name), add constraint book_categories_org_slug unique (organization_id, slug);
alter table public.internship_programs drop constraint internship_programs_slug_key, add constraint internship_programs_org_slug unique (organization_id, slug);
alter table public.organization_settings add constraint organization_settings_org_unique unique (organization_id);
alter table public.payment_settings add constraint payment_settings_org_unique unique (organization_id);

-- Hindi fields for the bilingual site (English is the default language)
alter table public.organization_settings
  add column organization_name_hi text, add column tagline_hi text, add column about_short_hi text,
  add column donation_text_hi text, add column footer_text_hi text;
update public.organization_settings set organization_name_hi = 'एकात्म कलार युवा मंच',
  tagline_hi = 'समाज सेवा के लिए एकजुट युवा' where organization_id = (select id from core.organizations where slug = 'ekym');
do $$
declare t text;
begin
  foreach t in array array['homepage_sections','homepage_slides','festival_slides','seva_projects','blogs','news','campaigns','galleries','videos','reels','testimonials','internship_programs','book_categories'] loop
    execute format('alter table public.%I add column title_hi text', t);
  end loop;
end $$;
alter table public.homepage_sections add column subtitle_hi text;
alter table public.homepage_slides add column subtitle_hi text, add column description_hi text, add column button_text_hi text;
alter table public.festival_slides add column message_hi text;
alter table public.seva_projects add column name_hi text, add column short_description_hi text, add column description_hi text;
alter table public.blogs add column excerpt_hi text, add column content_hi text;
alter table public.news add column description_hi text;
alter table public.campaigns add column description_hi text;
alter table public.galleries add column description_hi text;
alter table public.testimonials add column message_hi text;
alter table public.internship_programs add column name_hi text, add column description_hi text;
alter table public.book_categories add column name_hi text;
-- title_hi is not meaningful on tables that use "name"; harmless and keeps a uniform rule for the CMS

-- private.* helpers (used by storage policies) now mean "has this permission in ANY organization"
create or replace function private.has_perm_any(perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1 from core.role_assignments ra join core.roles r on r.id = ra.role_id
     where ra.user_id = auth.uid()
       and (ra.valid_from is null or ra.valid_from <= current_date)
       and (ra.valid_to is null or ra.valid_to >= current_date)
       and r.permissions && array['*', perm, split_part(perm, '.', 1) || '.*']);
$$;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('org.settings.edit') $$;
create or replace function private.is_super_admin() returns boolean language sql stable security definer set search_path = '' as $$ select core.is_platform_admin() $$;
create or replace function private.can_manage_content() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('cms.post.publish') $$;
create or replace function private.can_manage_blood() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('community.blood.manage') $$;
create or replace function private.can_manage_library() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('community.library.manage') $$;
create or replace function private.can_manage_volunteers() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('community.volunteer.manage') $$;
create or replace function private.can_manage_internships() returns boolean language sql stable security definer set search_path = '' as $$ select private.has_perm_any('community.internship.manage') $$;
create or replace function private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1 from core.role_assignments ra join core.roles r on r.id = ra.role_id
     where ra.user_id = auth.uid() and cardinality(r.permissions) > 0
       and (ra.valid_to is null or ra.valid_to >= current_date));
$$;
grant execute on function private.has_perm_any(text) to anon, authenticated, service_role;

-- rewrite table policies: org-wide checks become checks inside the row's organization
do $$
declare
  p record; q text; c text; stmt text;
  tables text[] := array[
    'organization_settings','homepage_sections','homepage_slides','festival_slides','seva_projects','contributors',
    'blogs','news','videos','reels','galleries','gallery_items','testimonials','contact_messages','campaigns',
    'media_library','blood_donors','blood_requirements','book_categories','books','students',
    'book_donation_requests','material_donation_requests','volunteer_applications','internship_programs','intern_applications'];
  fn text;
begin
  for p in select * from pg_policies where schemaname = 'public' and tablename = any(tables) loop
    q := p.qual; c := p.with_check;
    fn := format('%I.organization_id', p.tablename);
    q := replace(q, 'private.can_manage_content()', format('core.can(%s, %L)', fn, 'cms.post.publish'));
    c := replace(c, 'private.can_manage_content()', format('core.can(%s, %L)', fn, 'cms.post.publish'));
    q := replace(q, 'private.is_admin()', format('core.can(%s, %L)', fn, 'org.settings.edit'));
    c := replace(c, 'private.is_admin()', format('core.can(%s, %L)', fn, 'org.settings.edit'));
    q := replace(q, 'private.is_super_admin()', 'core.is_platform_admin()');
    c := replace(c, 'private.is_super_admin()', 'core.is_platform_admin()');
    q := replace(q, 'private.is_staff()', format('core.is_org_team(%s)', fn));
    c := replace(c, 'private.is_staff()', format('core.is_org_team(%s)', fn));
    q := replace(q, 'private.can_manage_blood()', format('core.can(%s, %L)', fn, 'community.blood.manage'));
    c := replace(c, 'private.can_manage_blood()', format('core.can(%s, %L)', fn, 'community.blood.manage'));
    q := replace(q, 'private.can_manage_library()', format('core.can(%s, %L)', fn, 'community.library.manage'));
    c := replace(c, 'private.can_manage_library()', format('core.can(%s, %L)', fn, 'community.library.manage'));
    q := replace(q, 'private.can_manage_volunteers()', format('core.can(%s, %L)', fn, 'community.volunteer.manage'));
    c := replace(c, 'private.can_manage_volunteers()', format('core.can(%s, %L)', fn, 'community.volunteer.manage'));
    q := replace(q, 'private.can_manage_internships()', format('core.can(%s, %L)', fn, 'community.internship.manage'));
    c := replace(c, 'private.can_manage_internships()', format('core.can(%s, %L)', fn, 'community.internship.manage'));
    if q is distinct from p.qual or c is distinct from p.with_check then
      stmt := format('alter policy %I on public.%I', p.policyname, p.tablename);
      if q is not null then stmt := stmt || format(' using (%s)', q); end if;
      if c is not null then stmt := stmt || format(' with check (%s)', c); end if;
      execute stmt;
    end if;
    if coalesce(q, '') like '%private.%' or coalesce(c, '') like '%private.%' then
      raise exception 'Unhandled private.* call left in policy % on %', p.policyname, p.tablename;
    end if;
  end loop;
end $$;

-- contact messages inbox: needs its own permission, not just any team role
alter policy "staff read messages" on public.contact_messages
  using (core.can(contact_messages.organization_id, 'community.messages.manage'));
alter policy "staff update messages" on public.contact_messages
  using (core.can(contact_messages.organization_id, 'community.messages.manage'))
  with check (core.can(contact_messages.organization_id, 'community.messages.manage'));

-- donations & payments
alter policy "Finance staff read donations" on public.donations
  using (core.can(donations.organization_id, 'community.donation.view') or core.can(donations.organization_id, 'fin.report.view'));
alter policy "Admins update donations" on public.donations
  using (core.can(donations.organization_id, 'fin.voucher.create')) with check (core.can(donations.organization_id, 'fin.voucher.create'));
alter policy "Finance staff read transactions" on public.payment_transactions
  using (core.can(payment_transactions.organization_id, 'community.donation.view') or core.can(payment_transactions.organization_id, 'fin.report.view'));
alter policy "Finance staff read receipts" on public.donation_receipts
  using (core.can(donation_receipts.organization_id, 'community.donation.view') or core.can(donation_receipts.organization_id, 'fin.report.view'));
alter policy "Auditors read webhook events" on public.payment_webhook_events
  using (core.is_platform_admin() or (payment_webhook_events.organization_id is not null and core.can(payment_webhook_events.organization_id, 'audit.view')));
alter policy "Admins manage payment settings" on public.payment_settings
  using (core.can(payment_settings.organization_id, 'org.settings.edit')) with check (core.can(payment_settings.organization_id, 'org.settings.edit'));

-- legacy website-only role tables: platform admin only (team roles now live in core)
alter policy "roles managed by super admin" on public.roles using (core.is_platform_admin()) with check (core.is_platform_admin());
alter policy "admin assigns roles" on public.user_roles using (core.is_platform_admin()) with check (core.is_platform_admin());
alter policy "own roles or admin read" on public.user_roles using (user_id = auth.uid() or core.is_platform_admin());
alter policy "own profile read" on public.site_profiles using (id = auth.uid() or core.is_platform_admin());
alter policy "own profile update" on public.site_profiles using (id = auth.uid() or core.is_platform_admin()) with check (id = auth.uid() or core.is_platform_admin());
alter policy "audit staff read" on public.audit_logs using (core.is_platform_admin());

-- receipt numbers: per-organization prefix stays in payment_settings; one settings row per org
-- (next_receipt_number reads the first row; make it org-aware)
create or replace function public.next_receipt_number(p_org uuid)
returns text language sql volatile set search_path = public as $$
  select coalesce((select receipt_prefix from public.payment_settings where organization_id = p_org), 'KC')
    || '/' || to_char(now(), 'YYYY') || '/' || lpad(nextval('public.receipt_number_seq')::text, 6, '0');
$$;
revoke all on function public.next_receipt_number(uuid) from public, anon, authenticated;
