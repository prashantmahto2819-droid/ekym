-- Kalchuri One · Phase 9 · website builder: block pages with revisions, menus, branding, custom domains.

-- ---------- pages ----------
create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  title text not null, title_hi text,
  blocks jsonb not null default '[]'::jsonb,            -- [{id, type, ...props}] rendered by src/components/site/Blocks.tsx
  status text not null default 'draft' check (status in ('draft','published','archived')),
  publish_at timestamptz,                               -- scheduled publish (public read only after this time)
  seo jsonb not null default '{}'::jsonb,               -- {title, description, image}
  is_home boolean not null default false,               -- replaces the default home page when published
  show_in_menu boolean not null default false,
  menu_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);
create index on public.cms_pages(organization_id, status);
create unique index cms_pages_one_home on public.cms_pages(organization_id) where is_home and status = 'published';
create trigger trg_cms_pages_updated before update on public.cms_pages for each row execute function public.set_updated_at();
create trigger audit_cms_pages after insert or update or delete on public.cms_pages for each row execute function core.audit_row();

create table public.cms_page_revisions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  organization_id uuid not null references core.organizations(id) on delete cascade,
  title text not null,
  blocks jsonb not null,
  saved_by uuid references auth.users(id) on delete set null,
  saved_at timestamptz not null default now()
);
create index on public.cms_page_revisions(page_id, saved_at desc);

-- keep the last 30 revisions automatically whenever blocks/title change
create or replace function public.trg_cms_page_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (old.blocks is distinct from new.blocks or old.title is distinct from new.title) then
    insert into public.cms_page_revisions(page_id, organization_id, title, blocks, saved_by) values (old.id, old.organization_id, old.title, old.blocks, auth.uid());
    delete from public.cms_page_revisions r where r.page_id = old.id and r.id not in (select id from public.cms_page_revisions where page_id = old.id order by saved_at desc limit 30);
  end if;
  new.updated_by := auth.uid();
  return new;
end $$;
create trigger trg_cms_pages_revision before update on public.cms_pages for each row execute function public.trg_cms_page_revision();

alter table public.cms_pages enable row level security;
alter table public.cms_page_revisions enable row level security;
create policy cms_pages_public_read on public.cms_pages for select using (status = 'published' and (publish_at is null or publish_at <= now()));
create policy cms_pages_edit on public.cms_pages for all to authenticated using (core.can(organization_id, 'cms.page.edit')) with check (core.can(organization_id, 'cms.page.edit'));
create policy cms_revisions_read on public.cms_page_revisions for select to authenticated using (core.can(organization_id, 'cms.page.edit'));
grant select on public.cms_pages to anon, authenticated;
grant insert, update, delete on public.cms_pages to authenticated;
grant select on public.cms_page_revisions to authenticated;

create or replace function public.k1_page_restore(p_revision uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r public.cms_page_revisions;
begin
  select * into r from public.cms_page_revisions where id = p_revision;
  if r is null or not core.can(r.organization_id, 'cms.page.edit') then raise exception 'Not allowed'; end if;
  update public.cms_pages set blocks = r.blocks, title = r.title where id = r.page_id;
end $$;
grant execute on function public.k1_page_restore(uuid) to authenticated;

-- ---------- menus ----------
create table public.cms_menus (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  location text not null check (location in ('header','footer')),
  items jsonb not null default '[]'::jsonb,             -- [{label, label_hi, to, children:[{label,label_hi,to}]}]
  updated_at timestamptz not null default now(),
  unique (organization_id, location)
);
create trigger trg_cms_menus_updated before update on public.cms_menus for each row execute function public.set_updated_at();
alter table public.cms_menus enable row level security;
create policy cms_menus_read on public.cms_menus for select using (true);
create policy cms_menus_write on public.cms_menus for all to authenticated using (core.can(organization_id, 'cms.settings.edit')) with check (core.can(organization_id, 'cms.settings.edit'));
grant select on public.cms_menus to anon, authenticated;
grant insert, update, delete on public.cms_menus to authenticated;

-- ---------- branding (core.organizations.branding) ----------
create or replace function public.k1_set_branding(p_org uuid, p_branding jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not core.can(p_org, 'cms.settings.edit') then raise exception 'Not allowed'; end if;
  update core.organizations set branding = coalesce(branding, '{}'::jsonb) || p_branding where id = p_org;
  return (select branding from core.organizations where id = p_org);
end $$;
grant execute on function public.k1_set_branding(uuid, jsonb) to authenticated;

-- ---------- domains ----------
-- org admin requests a custom domain (unverified); platform admin verifies after DNS points to the worker
create or replace function public.k1_request_domain(p_org uuid, p_hostname text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare did uuid; host text;
begin
  if not core.can(p_org, 'org.settings.edit') then raise exception 'Not allowed'; end if;
  host := lower(trim(p_hostname));
  if host !~ '^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'Enter a valid hostname like samaj.example.org'; end if;
  insert into core.org_domains(organization_id, hostname, kind) values (p_org, host, 'custom') returning id into did;
  return did;
end $$;
grant execute on function public.k1_request_domain(uuid, text) to authenticated;

create or replace function public.k1_org_domains(p_org uuid)
returns table (id uuid, hostname text, kind text, is_primary boolean, verified_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.hostname, d.kind, d.is_primary, d.verified_at, d.created_at from core.org_domains d
   where d.organization_id = p_org and core.can(p_org, 'org.settings.edit') order by d.created_at;
$$;
grant execute on function public.k1_org_domains(uuid) to authenticated;

create or replace function public.k1_verify_domain(p_id uuid, p_verified boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not core.is_platform_admin() then raise exception 'Platform admin only'; end if;
  update core.org_domains set verified_at = case when p_verified then now() end where id = p_id;
end $$;
grant execute on function public.k1_verify_domain(uuid, boolean) to authenticated;

create or replace function public.k1_delete_domain(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare d core.org_domains;
begin
  select * into d from core.org_domains where id = p_id;
  if d is null then return; end if;
  if not (core.is_platform_admin() or (core.can(d.organization_id, 'org.settings.edit') and d.verified_at is null)) then raise exception 'Not allowed'; end if;
  delete from core.org_domains where id = p_id;
end $$;
grant execute on function public.k1_delete_domain(uuid) to authenticated;

-- pending domain list for the platform admin
create or replace function public.k1_pending_domains()
returns table (id uuid, hostname text, organization_id uuid, org_name text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select d.id, d.hostname, d.organization_id, o.name, d.created_at from core.org_domains d join core.organizations o on o.id = d.organization_id
   where d.verified_at is null and d.kind = 'custom' and core.is_platform_admin() order by d.created_at;
$$;
grant execute on function public.k1_pending_domains() to authenticated;

-- only verified custom domains resolve (subdomains always do)
create or replace function public.k1_resolve_host(p_host text)
returns table (organization_id uuid, slug text, name text, name_hi text, short_name text, branding jsonb, parent_id uuid, child_count int)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.short_name, o.branding, o.parent_id,
         (select count(*)::int from core.organizations c where c.parent_id = o.id and c.status = 'active')
    from core.org_domains d join core.organizations o on o.id = d.organization_id
   where d.hostname = lower(p_host) and o.status = 'active' and (d.kind = 'subdomain' or d.verified_at is not null);
$$;
