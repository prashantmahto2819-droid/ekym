-- tenant wrappers also return parent_id and number of sub-organizations (for the central feed / nomination UI)
drop function if exists public.k1_resolve_host(text);
drop function if exists public.k1_org_by_slug(text);
create function public.k1_resolve_host(p_host text)
returns table (organization_id uuid, slug text, name text, name_hi text, short_name text, branding jsonb, parent_id uuid, child_count int)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.short_name, o.branding, o.parent_id,
         (select count(*)::int from core.organizations c where c.parent_id = o.id and c.status = 'active')
    from core.org_domains d join core.organizations o on o.id = d.organization_id
   where d.hostname = lower(p_host) and o.status = 'active';
$$;
create function public.k1_org_by_slug(p_slug text)
returns table (organization_id uuid, slug text, name text, name_hi text, short_name text, branding jsonb, parent_id uuid, child_count int)
language sql stable security definer set search_path = '' as $$
  select o.id, o.slug, o.name, o.name_hi, o.short_name, o.branding, o.parent_id,
         (select count(*)::int from core.organizations c where c.parent_id = o.id and c.status = 'active')
    from core.organizations o where o.slug = lower(p_slug) and o.status = 'active';
$$;
grant execute on function public.k1_resolve_host(text), public.k1_org_by_slug(text) to anon, authenticated;
