do $$ begin
  raise notice 'DEF %', replace(pg_get_functiondef('public.dashboard_stats()'::regprocedure), E'\n', ' ⏎ ');
end $$;
