do $$ begin
  raise notice 'dashboard_stats def: %', left(pg_get_functiondef('public.dashboard_stats()'::regprocedure), 3000);
  raise notice 'profiles pending (details done): %, pending all: %', (select count(*) from public.profiles where status='pending' and details_done_at is not null), (select count(*) from public.profiles where status='pending');
  raise notice 'families pending: %', (select count(*) from public.families where status='pending');
  raise notice 'suggestions pending: %', (select count(*) from public.member_suggestions where status='pending');
  raise notice 'family_links pending: %', (select count(*) from public.family_links where status='pending');
  raise notice 'same_person pending: %', (select count(*) from public.same_person_requests where status='pending');
  raise notice 'origin requests pending: %', (select count(*) from public.origin_requests where status='pending');
  raise notice 'letters pending_approval: %', (select count(*) from public.letters where status='pending_approval');
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
