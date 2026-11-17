do $$ declare l text; begin
  foreach l in array string_to_array(pg_get_functiondef('public.merge_villages(uuid,uuid)'::regprocedure), E'\n') loop raise notice '| %', l; end loop;
end $$;
