do $$ declare r record; begin
  raise notice 'CAP %', (select value from public.app_settings where key = 'welcome_daily_cap');
  for r in select status, kind, count(*) n from public.shok_phone_welcomes group by 1, 2 order by 1, 2 loop raise notice 'W % % n=%', r.status, r.kind, r.n; end loop;
end $$;
