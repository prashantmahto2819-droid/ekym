do $$ declare r record; begin
  raise notice 'fn patched: %', position('shok_home_org' in pg_get_functiondef('public.admin_can_manage_family(uuid,uuid)'::regprocedure)) > 0;
  for r in select p.id, p.full_name, p.admin_scope, exists(select 1 from core.platform_admins pa where pa.user_id = p.id) pa,
                  (select string_agg(o.slug || ':' || ro.key, ', ') from core.role_assignments ra join core.roles ro on ro.id = ra.role_id join core.organizations o on o.id = ra.organization_id where ra.user_id = p.id) roles
             from public.profiles p where p.role = 'admin' loop
    raise notice 'ADMIN % scope=% platform=% roles=%', r.full_name, r.admin_scope, r.pa, r.roles; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
