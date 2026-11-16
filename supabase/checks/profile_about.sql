do $$ begin
  raise notice 'k1_profile has about: %', position('''about''' in pg_get_functiondef('public.k1_profile(uuid)'::regprocedure)) > 0;
  raise notice 'save fn: %', to_regprocedure('public.k1_profile_save_about(jsonb)') is not null;
end $$;
