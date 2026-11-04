-- Fix: a non-admin user who registers a new organization must become its first admin.
-- The role-assignment guard blocked this (creator has no rights yet). Allow exactly one case:
-- the creator assigning himself org_admin in an org he created that has no team yet.
create or replace function core.role_assignments_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r_org uuid; r_key text;
begin
  if auth.uid() is null then return new; end if; -- service role / migrations
  select organization_id, key into r_org, r_key from core.roles where id = new.role_id;
  if r_org is not null and r_org <> new.organization_id then
    raise exception 'This role belongs to another organization';
  end if;
  if tg_op = 'INSERT' and new.user_id = auth.uid() and r_org is null and r_key = 'org_admin'
     and exists (select 1 from core.organizations o where o.id = new.organization_id and o.created_by = auth.uid())
     and not exists (select 1 from core.role_assignments ra where ra.organization_id = new.organization_id) then
    new.created_by := auth.uid();
    return new; -- founder bootstrap
  end if;
  if not core.can_grant(new.organization_id, new.role_id) then
    raise exception 'You cannot grant a role with more rights than you have';
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;

-- the founder insert happens inside the organizations trigger, so RLS on role_assignments must not block it:
-- organizations_after_insert is SECURITY DEFINER (runs as owner, bypasses RLS); only the guard above applied.
