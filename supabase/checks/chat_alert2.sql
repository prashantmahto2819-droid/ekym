do $$ begin
  raise notice 'alert org for saurabh (whatsapp): %', (select o.name from core.organizations o where o.id = public.k1_chat_alert_org('9aa5c061-65ad-445a-a2ae-85a149756d76', 'd5fc59d2-4dd2-4800-925f-3ab6e978a44c', 'whatsapp'));
  raise notice 'channel: %', public.k1_pick_channel(public.k1_chat_alert_org('9aa5c061-65ad-445a-a2ae-85a149756d76', 'd5fc59d2-4dd2-4800-925f-3ab6e978a44c', 'whatsapp'), 'whatsapp') is not null;
  raise notice 'patched: %', position('k1_chat_alert_org' in pg_get_functiondef('public.trg_cm_chat_dm_alert()'::regprocedure)) > 0;
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm; end $$;
