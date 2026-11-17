do $$ declare r record; begin
  raise notice 'SET %', (select jsonb_object_agg(key, case when key in ('relay_key') then '***' else value end) from public.app_settings where key like 'welcome%' or key in ('relay_url','relay_session'));
  raise notice 'STATS %', public.shok_phone_welcome_stats();
  for r in select status, count(*) n, max(created_at) last_created, max(sent_at) last_sent from public.shok_phone_welcomes group by status loop raise notice 'W % n=% last_created=% last_sent=%', r.status, r.n, r.last_created, r.last_sent; end loop;
  for r in select date_trunc('day', sent_at)::date d, count(*) n from public.shok_phone_welcomes where sent_at > now() - interval '7 days' group by 1 order by 1 loop raise notice 'DAY % sent=%', r.d, r.n; end loop;
  for r in select left(coalesce(error,''),120) e, count(*) n from public.shok_phone_welcomes where error is not null group by 1 order by 2 desc limit 5 loop raise notice 'ERR % x%', r.e, r.n; end loop;
  for r in select jobname, schedule, active from cron.job where jobname ilike '%welcome%' loop raise notice 'CRON % % %', r.jobname, r.schedule, r.active; end loop;
  for r in select d.status, d.return_message, d.start_time from cron.job_run_details d join cron.job j on j.jobid = d.jobid where j.jobname ilike '%welcome%' order by d.start_time desc limit 3 loop raise notice 'RUN % % %', r.start_time, r.status, left(r.return_message, 100); end loop;
  for r in select w.status, w.created_at, w.sent_at, w.kind, (select count(*) from net._http_response) x from public.shok_phone_welcomes w order by w.created_at desc limit 5 loop raise notice 'RECENT % % % %', r.created_at, r.status, r.sent_at, r.kind; end loop;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
