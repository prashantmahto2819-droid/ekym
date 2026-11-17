do $$ declare r record; l text; begin
  for r in select id, email, phone, created_at, deleted_at, banned_until from auth.users where phone like '%9770974077' or email ilike '%9770974077%' loop
    raise notice 'AUTH % email=% phone=% created=% deleted=% banned=%', r.id, r.email, r.phone, r.created_at, r.deleted_at, r.banned_until; end loop;
  for r in select id, full_name, phone, status, role, created_at, (select count(*) from auth.users u where u.id = p.id) has_auth from public.profiles p where phone like '%9770974077' loop
    raise notice 'PROF % % phone=% % % created=% auth=%', r.id, r.full_name, r.phone, r.status, r.role, r.created_at, r.has_auth; end loop;
  for r in select tgname, p.proname from pg_trigger g join pg_proc p on p.oid = g.tgfoid where g.tgrelid = 'auth.users'::regclass and not tgisinternal loop raise notice 'TRG % %', r.tgname, r.proname; end loop;
  foreach l in array string_to_array(pg_get_functiondef('public.handle_new_user()'::regprocedure), E'\n') loop raise notice '| %', l; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
