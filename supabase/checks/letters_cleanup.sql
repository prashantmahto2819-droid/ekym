do $$ declare r record; begin
  raise notice 'to clean now: %', (select count(*) from public.shok_letters_to_clean(100));
  for r in select jobname, schedule from cron.job where jobname in ('shok-letters-cleanup','cron-log-cleanup') loop raise notice 'JOB % %', r.jobname, r.schedule; end loop;
  raise notice 'cron log rows: %, oldest: %, size: %', (select count(*) from cron.job_run_details), (select min(end_time) from cron.job_run_details), pg_size_pretty(pg_total_relation_size('cron.job_run_details'));
end $$;
