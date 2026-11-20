do $$
declare r record;
begin
  for r in select p.proname, pg_get_function_identity_arguments(p.oid) a, pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('directory_members','family_tree','merge_villages','merge_origin_villages') loop
    raise notice 'FN<<%(%)>>%<<END>>', r.proname, r.a, case when r.proname like 'merge%' then '' else r.d end;
  end loop;
end $$;
