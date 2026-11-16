do $$ begin
  raise notice 'vapid public set: %', exists (select 1 from public.server_secrets where key = 'vapid_public');
  raise notice 'last pg_net responses: %', (select string_agg(status_code::text || ' ' || left(coalesce(content, error_msg, ''), 120), ' | ') from (select * from net._http_response order by created desc limit 3) r);
  raise notice 'mute fn: %, prefs channels col: %', to_regprocedure('public.k1_chat_mute_for(uuid,int)') is not null, exists (select 1 from information_schema.columns where table_name = 'k1_notification_prefs' and column_name = 'channels');
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
