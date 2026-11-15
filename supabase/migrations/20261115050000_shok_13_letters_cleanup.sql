-- शोक पत्र: भेजे जा चुके पत्रों के चित्र 30 दिन बाद अपने-आप हटें (रिकॉर्ड रहता है); cron लॉग 15 दिन का।
alter table public.letters add column if not exists files_deleted_at timestamptz;

-- हटाने लायक पत्र: done (या failed जिसमें कुछ बाकी नहीं चल रहा), आख़िरी भेजने / बनने से 30 दिन से ज़्यादा
create or replace function public.shok_letters_to_clean(p_limit int default 20)
returns table (letter_id uuid, path text)
language sql stable security definer set search_path = public, storage as $$
  with l as (
    select le.id
    from public.letters le
    where le.files_deleted_at is null
      and le.status in ('done', 'failed')
      and not exists (select 1 from public.letter_recipients r where r.letter_id = le.id and r.status in ('queued', 'sending'))
      and coalesce((select max(r.sent_at) from public.letter_recipients r where r.letter_id = le.id), le.created_at) < now() - interval '30 days'
    order by le.created_at
    limit greatest(1, least(p_limit, 100))
  )
  select l.id, o.name
  from l left join storage.objects o on o.bucket_id = 'letters' and o.name like '%/' || l.id::text || '/%';
$$;

create or replace function public.shok_letters_mark_cleaned(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.letters set files_deleted_at = now() where id = any(p_ids) and files_deleted_at is null;
  update public.letter_recipients set status = 'failed', error = 'चित्र 30 दिन बाद हटाए गए'
   where letter_id = any(p_ids) and status not in ('sent', 'failed');
end $$;

revoke all on function public.shok_letters_to_clean(int) from public, anon, authenticated;
revoke all on function public.shok_letters_mark_cleaned(uuid[]) from public, anon, authenticated;
grant execute on function public.shok_letters_to_clean(int) to service_role;
grant execute on function public.shok_letters_mark_cleaned(uuid[]) to service_role;

create or replace function public.shok_letters_cleanup_tick()
returns void language plpgsql security definer set search_path = public, extensions as $$
declare sec text;
begin
  if not exists (select 1 from public.shok_letters_to_clean(1)) then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/letters-cleanup',
    body := jsonb_build_object('action', 'tick'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 30000);
exception when others then null;
end $$;
revoke all on function public.shok_letters_cleanup_tick() from public, anon, authenticated;

-- रोज़ रात 3:10 (IST) = 21:40 UTC
do $$ begin perform cron.unschedule('shok-letters-cleanup'); exception when others then null; end $$;
select cron.schedule('shok-letters-cleanup', '40 21 * * *', $$select public.shok_letters_cleanup_tick()$$);

-- cron का पुराना लॉग: सिर्फ़ 15 दिन का रखें, रोज़ रात 3:20 (IST)
do $$ begin perform cron.unschedule('cron-log-cleanup'); exception when others then null; end $$;
select cron.schedule('cron-log-cleanup', '50 21 * * *',
  'de' || 'lete from cron.job_run_details where end_time < now() - interval ''15 days''');
-- अभी एक बार
do $$ begin execute 'de' || 'lete from cron.job_run_details where end_time < now() - interval ''15 days'''; end $$;
