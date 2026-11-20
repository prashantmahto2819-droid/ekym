-- shok_29..32 लागू हुए या नहीं (केवल पढ़ना)
do $$
declare r record; n int;
begin
  for r in select p.proname from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname = 'public' and p.proname in ('shok_receipt','shok_receipt_secret_set','shok_receipt_status','shok_owner_relay_ok','shok_relay_allot_set','trg_profile_approved_welcome') order by 1 loop
    raise notice 'fn ok: %', r.proname;
  end loop;
  select count(*) into n from information_schema.columns where table_schema='public' and table_name='letter_recipients' and column_name in ('wa_message_id','delivered_at','read_at');
  raise notice 'letter_recipients receipt columns: % / 3', n;
  for r in select o.slug, public.shok_owner_relay_ok(o.id) ok from core.organizations o order by 1 loop
    raise notice 'org % owner relay: %', r.slug, r.ok;
  end loop;
  select count(*) into n from public.server_secrets where key = 'relay_webhook_secret';
  raise notice 'webhook secret set: %', n;
end $$;
