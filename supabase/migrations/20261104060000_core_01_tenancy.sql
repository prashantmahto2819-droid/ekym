-- Kalchuri One · Phase 1 · core tenancy: organizations, hierarchy, domains, roles, permissions, audit.
-- Additive only: no existing table is changed.

create schema if not exists core;
grant usage on schema core to anon, authenticated, service_role;

create type core.org_kind as enum ('samaj','foundation','trust','committee','association','youth_wing','women_wing','business','other');
create type core.org_level as enum ('national','state','district','tehsil','city','local');
create type core.org_status as enum ('pending','active','suspended');

-- ---------- organizations ----------
create table core.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  name text not null check (length(trim(name)) > 1),
  name_hi text,
  short_name text,
  kind core.org_kind not null default 'association',
  level core.org_level not null default 'local',
  parent_id uuid references core.organizations(id) on delete restrict,
  state text, district text, tehsil text, city text,
  social_region_id uuid references public.social_regions(id) on delete set null,
  status core.org_status not null default 'pending',
  branding jsonb not null default '{}'::jsonb,       -- logo, colors, fonts
  registration jsonb not null default '{}'::jsonb,   -- reg no, 12A/80G, PAN
  share_with_parent boolean not null default false,  -- parent org may read (not finance)
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on core.organizations(parent_id);
create index on core.organizations(status);
create trigger trg_org_updated before update on core.organizations for each row execute function public.set_updated_at();

-- ---------- hierarchy (closure table) ----------
create table core.org_tree (
  ancestor_id uuid not null references core.organizations(id) on delete cascade,
  descendant_id uuid not null references core.organizations(id) on delete cascade,
  depth int not null check (depth >= 0),
  primary key (ancestor_id, descendant_id)
);
create index on core.org_tree(descendant_id);

create or replace function core.org_tree_maintain()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into core.org_tree(ancestor_id, descendant_id, depth) values (new.id, new.id, 0);
    if new.parent_id is not null then
      insert into core.org_tree(ancestor_id, descendant_id, depth)
      select t.ancestor_id, new.id, t.depth + 1 from core.org_tree t where t.descendant_id = new.parent_id;
    end if;
  elsif tg_op = 'UPDATE' and new.parent_id is distinct from old.parent_id then
    if new.parent_id is not null and exists (
      select 1 from core.org_tree where ancestor_id = new.id and descendant_id = new.parent_id) then
      raise exception 'An organization cannot be placed under itself or its own sub-organization';
    end if;
    -- detach subtree from old ancestors
    delete from core.org_tree t
     where t.descendant_id in (select descendant_id from core.org_tree where ancestor_id = new.id)
       and t.ancestor_id not in (select descendant_id from core.org_tree where ancestor_id = new.id);
    -- attach under new parent
    if new.parent_id is not null then
      insert into core.org_tree(ancestor_id, descendant_id, depth)
      select p.ancestor_id, s.descendant_id, p.depth + s.depth + 1
        from core.org_tree p, core.org_tree s
       where p.descendant_id = new.parent_id and s.ancestor_id = new.id;
    end if;
  end if;
  return new;
end $$;
create trigger trg_org_tree after insert or update of parent_id on core.organizations
  for each row execute function core.org_tree_maintain();

-- ---------- domains ----------
create table core.org_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  hostname text not null unique check (hostname = lower(hostname) and hostname ~ '^[a-z0-9.-]+$'),
  kind text not null default 'subdomain' check (kind in ('subdomain','custom')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index on core.org_domains(organization_id);

-- ---------- permissions, roles, departments ----------
create table core.permissions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  module text not null,
  label text not null,
  label_hi text
);

create table core.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references core.organizations(id) on delete cascade, -- null = system template
  key text not null check (key ~ '^[a-z_]+$'),
  name text not null,
  name_hi text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index roles_org_key on core.roles (coalesce(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), key);
create trigger trg_roles_updated before update on core.roles for each row execute function public.set_updated_at();

create table core.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  name text not null,
  name_hi text,
  parent_id uuid references core.departments(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on core.departments(organization_id);

create table core.role_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references core.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references core.roles(id) on delete cascade,
  department_id uuid references core.departments(id) on delete cascade,
  valid_from date,
  valid_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create unique index role_assign_unique on core.role_assignments
  (organization_id, user_id, role_id, coalesce(department_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index on core.role_assignments(user_id);

create table core.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level text not null default 'super' check (level in ('super','support')),
  created_at timestamptz not null default now()
);

-- ---------- audit ----------
create table core.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid,
  actor_id uuid,
  table_schema text not null,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  at timestamptz not null default now()
);
create index on core.audit_log(organization_id, at desc);
create index on core.audit_log(table_schema, table_name, row_id);

create or replace function core.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  org uuid;
begin
  org := coalesce((r->>'organization_id')::uuid, case when tg_table_name = 'organizations' then (r->>'id')::uuid end);
  insert into core.audit_log(organization_id, actor_id, table_schema, table_name, row_id, action, old_data, new_data)
  values (org, auth.uid(), tg_table_schema, tg_table_name, r->>'id', lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

-- ---------- permission helpers ----------
create or replace function core.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.platform_admins where user_id = auth.uid());
$$;

-- true when the current user holds `perm` in `org` (exact key, module wildcard 'cms.*', or '*')
create or replace function core.can(org uuid, perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1
      from core.role_assignments ra
      join core.roles r on r.id = ra.role_id
     where ra.organization_id = org
       and ra.user_id = auth.uid()
       and (ra.valid_from is null or ra.valid_from <= current_date)
       and (ra.valid_to is null or ra.valid_to >= current_date)
       and (r.permissions && array['*', perm, split_part(perm, '.', 1) || '.*'])
  );
$$;

-- any active role in the org (i.e. part of its team)
create or replace function core.is_org_team(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1 from core.role_assignments ra
     where ra.organization_id = org and ra.user_id = auth.uid()
       and (ra.valid_to is null or ra.valid_to >= current_date));
$$;

-- parent-org oversight: user holds org.oversee in an ancestor and the org shares with parent
create or replace function core.can_oversee(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin() or exists (
    select 1 from core.organizations o
      join core.org_tree t on t.descendant_id = o.id and t.depth > 0
     where o.id = org and o.share_with_parent and core.can(t.ancestor_id, 'org.oversee'));
$$;

-- may the current user grant this role? (no privilege escalation)
create or replace function core.can_grant(org uuid, role uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select core.is_platform_admin()
      or (core.can(org, 'org.roles.manage') and not exists (
            select 1 from core.roles r, unnest(r.permissions) p
             where r.id = role and not core.can(org, p)));
$$;

create or replace function core.my_orgs()
returns table (organization_id uuid, slug text, name text, name_hi text, role_keys text[])
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, array_agg(distinct r.key)
    from core.role_assignments ra
    join core.organizations o on o.id = ra.organization_id
    join core.roles r on r.id = ra.role_id
   where ra.user_id = auth.uid() and (ra.valid_to is null or ra.valid_to >= current_date)
   group by o.id
  union all
  select o.id, o.slug, o.name, o.name_hi, array['platform_admin']
    from core.organizations o
   where core.is_platform_admin()
     and not exists (select 1 from core.role_assignments ra where ra.organization_id = o.id and ra.user_id = auth.uid());
$$;

-- public: which org does this hostname belong to (for the public website)
create or replace function core.resolve_host(p_host text)
returns table (organization_id uuid, slug text, name text, name_hi text, branding jsonb)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.branding
    from core.org_domains d join core.organizations o on o.id = d.organization_id
   where d.hostname = lower(p_host) and o.status = 'active';
$$;

-- ---------- guards ----------
create or replace function core.organizations_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if core.is_platform_admin() or auth.uid() is null then return new; end if;  -- platform admin / service role
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.created_by := auth.uid();
    if new.parent_id is not null and not core.can(new.parent_id, 'org.children.manage') then
      new.parent_id := null; -- placement under a parent is decided by that parent's admins or the platform
    end if;
  else
    if new.status is distinct from old.status then raise exception 'Only the platform admin can change organization status'; end if;
    if new.parent_id is distinct from old.parent_id
       and not (new.parent_id is not null and core.can(new.parent_id, 'org.children.manage')) then
      raise exception 'Changing the parent organization needs permission in the new parent';
    end if;
    if new.slug is distinct from old.slug then raise exception 'Only the platform admin can change the slug'; end if;
  end if;
  return new;
end $$;
create trigger trg_org_guard before insert or update on core.organizations
  for each row execute function core.organizations_guard();

-- creator of a new organization becomes its admin
create or replace function core.organizations_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if new.created_by is not null and not exists (select 1 from core.platform_admins where user_id = new.created_by) then
    select id into rid from core.roles where organization_id is null and key = 'org_admin';
    insert into core.role_assignments(organization_id, user_id, role_id, created_by)
    values (new.id, new.created_by, rid, new.created_by) on conflict do nothing;
  end if;
  return null;
end $$;
create trigger trg_org_after_insert after insert on core.organizations
  for each row execute function core.organizations_after_insert();

create or replace function core.role_assignments_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r_org uuid;
begin
  if auth.uid() is null then return new; end if; -- service role / migrations
  select organization_id into r_org from core.roles where id = new.role_id;
  if r_org is not null and r_org <> new.organization_id then
    raise exception 'This role belongs to another organization';
  end if;
  if not core.can_grant(new.organization_id, new.role_id) then
    raise exception 'You cannot grant a role with more rights than you have';
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
create trigger trg_role_assign_guard before insert or update on core.role_assignments
  for each row execute function core.role_assignments_guard();

-- ---------- audit triggers ----------
create trigger audit_organizations after insert or update or delete on core.organizations for each row execute function core.audit_row();
create trigger audit_org_domains after insert or update or delete on core.org_domains for each row execute function core.audit_row();
create trigger audit_roles after insert or update or delete on core.roles for each row execute function core.audit_row();
create trigger audit_role_assignments after insert or update or delete on core.role_assignments for each row execute function core.audit_row();
create trigger audit_platform_admins after insert or update or delete on core.platform_admins for each row execute function core.audit_row();

-- ---------- RLS ----------
alter table core.organizations enable row level security;
alter table core.org_tree enable row level security;
alter table core.org_domains enable row level security;
alter table core.permissions enable row level security;
alter table core.roles enable row level security;
alter table core.departments enable row level security;
alter table core.role_assignments enable row level security;
alter table core.platform_admins enable row level security;
alter table core.audit_log enable row level security;

create policy org_read on core.organizations for select
  using (status = 'active' or created_by = auth.uid() or core.is_org_team(id) or core.can_oversee(id));
create policy org_insert on core.organizations for insert to authenticated with check (true); -- guard trigger forces pending
create policy org_update on core.organizations for update to authenticated
  using (core.can(id, 'org.settings.edit')) with check (core.can(id, 'org.settings.edit'));
create policy org_delete on core.organizations for delete to authenticated using (core.is_platform_admin());

create policy tree_read on core.org_tree for select using (true);

create policy domains_read on core.org_domains for select to authenticated using (core.can(organization_id, 'org.settings.edit'));
create policy domains_write on core.org_domains for all to authenticated
  using (core.is_platform_admin()) with check (core.is_platform_admin());

create policy perms_read on core.permissions for select using (true);
create policy perms_write on core.permissions for all to authenticated
  using (core.is_platform_admin()) with check (core.is_platform_admin());

create policy roles_read on core.roles for select to authenticated
  using (organization_id is null or core.is_org_team(organization_id));
create policy roles_write on core.roles for all to authenticated
  using ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'org.roles.manage')))
  with check ((organization_id is null and core.is_platform_admin()) or (organization_id is not null and core.can(organization_id, 'org.roles.manage')));

create policy depts_read on core.departments for select to authenticated using (core.is_org_team(organization_id));
create policy depts_write on core.departments for all to authenticated
  using (core.can(organization_id, 'org.settings.edit')) with check (core.can(organization_id, 'org.settings.edit'));

create policy ra_read on core.role_assignments for select to authenticated
  using (user_id = auth.uid() or core.can(organization_id, 'org.roles.manage'));
create policy ra_write on core.role_assignments for all to authenticated
  using (core.can(organization_id, 'org.roles.manage')) with check (core.can(organization_id, 'org.roles.manage'));

create policy pa_read on core.platform_admins for select to authenticated using (user_id = auth.uid() or core.is_platform_admin());
create policy pa_write on core.platform_admins for all to authenticated
  using (core.is_platform_admin()) with check (core.is_platform_admin());

create policy audit_read on core.audit_log for select to authenticated
  using (core.is_platform_admin() or (organization_id is not null and core.can(organization_id, 'audit.view')));

-- ---------- grants ----------
grant select on core.organizations, core.org_tree, core.permissions to anon;
grant select, insert, update, delete on all tables in schema core to authenticated;
revoke insert, update, delete on core.audit_log, core.org_tree from authenticated;
grant all on all tables in schema core to service_role;
grant usage on all sequences in schema core to authenticated, service_role;

revoke all on all functions in schema core from public;
grant execute on function core.is_platform_admin(), core.can(uuid, text), core.is_org_team(uuid),
  core.can_oversee(uuid), core.can_grant(uuid, uuid), core.my_orgs() to authenticated;
grant execute on function core.resolve_host(text), core.is_platform_admin(), core.can(uuid, text),
  core.is_org_team(uuid), core.can_oversee(uuid) to anon;
grant execute on all functions in schema core to service_role;
