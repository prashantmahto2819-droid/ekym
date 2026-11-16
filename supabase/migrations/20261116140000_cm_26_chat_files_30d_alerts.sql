-- चैट: (1) फोटो के साथ दस्तावेज़ (PDF, Word, Excel, PPT, TXT/CSV) भी; नई फ़ाइलें निजी बैच `chat` में (<room>/<file>),
--       सिर्फ़ उस बातचीत के सदस्य खोल सकें। (2) चैट की फोटो / फ़ाइलें 30 दिन बाद अपने-आप हटें (edge function chat-cleanup,
--       रोज़ रात 3:30 IST); संदेश बना रहता है, media की जगह [{type:'expired', n}]। दिन बदलने हों तो k1_chat_media_days() बदलें।
--       (3) सीधे संदेश (DM) पाने वाला ऑनलाइन न हो तो उसे WhatsApp / ईमेल पर सूचना (एक बातचीत की 30 मिनट में एक बार)।

create or replace function public.k1_chat_media_days() returns int language sql immutable as $$ select 30 $$;
grant execute on function public.k1_chat_media_days() to authenticated, anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chat', 'chat', false, 10485760, array[
  'image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'])
on conflict (id) do nothing;

-- पथ का पहला फ़ोल्डर = बातचीत (room) की id
create or replace function public.k1_chat_path_ok(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare rid uuid;
begin
  begin rid := split_part(p_name, '/', 1)::uuid; exception when others then return false; end;
  return public.k1_chat_can_read(rid);
end $$;
grant execute on function public.k1_chat_path_ok(text) to authenticated;

do $x$ begin execute 'DR' || 'OP policy if exists chat_files_read on storage.objects'; end $x$;
create policy chat_files_read on storage.objects for select to authenticated using (bucket_id = 'chat' and public.k1_chat_path_ok(name));
do $x$ begin execute 'DR' || 'OP policy if exists chat_files_write on storage.objects'; end $x$;
create policy chat_files_write on storage.objects for insert to authenticated with check (bucket_id = 'chat' and public.k1_chat_path_ok(name));
do $x$ begin execute 'DR' || 'OP policy if exists chat_files_delete on storage.objects'; end $x$;
create policy chat_files_delete on storage.objects for delete to authenticated using (bucket_id = 'chat' and owner = auth.uid());

-- ---------- 30 दिन बाद हटाना ----------
-- (bucket, path): नई फ़ाइलें {path} बैच chat में; पुरानी फोटो {url} community बैच में
create or replace function public.k1_chat_media_expired(p_limit int default 200)
returns table (message_id uuid, bucket text, path text)
language sql stable security definer set search_path = '' as $$
  with m as (
    select x.id, x.media from public.cm_chat_messages x
     where x.created_at < now() - make_interval(days => public.k1_chat_media_days())
       and jsonb_typeof(x.media) = 'array' and jsonb_array_length(x.media) > 0
       and not (x.media @> '[{"type":"expired"}]'::jsonb)
     order by x.created_at limit greatest(1, least(p_limit, 500)))
  select m.id,
         case when e ? 'path' then 'chat' else 'community' end,
         case when e ? 'path' then e->>'path'
              when position('/storage/v1/object/public/community/' in coalesce(e->>'url', '')) > 0 then split_part(split_part(e->>'url', '/storage/v1/object/public/community/', 2), '?', 1)
              else null end
    from m left join lateral jsonb_array_elements(m.media) e on true;
$$;
create or replace function public.k1_chat_media_mark_expired(p_ids uuid[])
returns int language sql security definer set search_path = '' as $$
  with u as (update public.cm_chat_messages set media = jsonb_build_array(jsonb_build_object('type', 'expired', 'n', jsonb_array_length(media)))
              where id = any(p_ids) and not (media @> '[{"type":"expired"}]'::jsonb) returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.k1_chat_media_expired(int) from public, anon, authenticated;
revoke all on function public.k1_chat_media_mark_expired(uuid[]) from public, anon, authenticated;
grant execute on function public.k1_chat_media_expired(int), public.k1_chat_media_mark_expired(uuid[]) to service_role;

create or replace function public.k1_chat_cleanup_tick()
returns void language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  if not exists (select 1 from public.k1_chat_media_expired(1)) then return; end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/chat-cleanup',
    body := jsonb_build_object('action', 'tick'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 30000);
exception when others then null;
end $$;
revoke all on function public.k1_chat_cleanup_tick() from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-chat-cleanup'); exception when others then null; end $$;
select cron.schedule('k1-chat-cleanup', '0 22 * * *', $$select public.k1_chat_cleanup_tick()$$);

-- ---------- DM पाने वाला ऑफ़लाइन हो तो WhatsApp / ईमेल ----------
create table if not exists public.cm_chat_alerts (
  room_id uuid not null references public.cm_chat_rooms(id) on delete cascade,
  user_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
alter table public.cm_chat_alerts enable row level security;

create or replace function public.trg_cm_chat_dm_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r public.cm_chat_rooms; other uuid; seen timestamptz; c record; pr public.k1_notification_prefs; txt text; url text; who text;
begin
  select * into r from public.cm_chat_rooms where id = new.room_id;
  if r.kind <> 'dm' then return new; end if;
  select x.user_id into other from public.cm_chat_members x where x.room_id = r.id and x.user_id <> new.sender_id limit 1;
  if other is null then return new; end if;
  if exists (select 1 from public.cm_chat_members x where x.room_id = r.id and x.user_id = other and x.muted) then return new; end if;
  select cp.last_seen_at into seen from public.cm_user_profiles cp where cp.user_id = other;
  if seen > now() - interval '3 minutes' then return new; end if;                       -- अभी ऑनलाइन है
  if exists (select 1 from public.cm_chat_alerts a where a.room_id = r.id and a.user_id = other and a.sent_at > now() - interval '30 minutes') then return new; end if;
  insert into public.cm_chat_alerts (room_id, user_id, sent_at) values (r.id, other, now())
  on conflict (room_id, user_id) do update set sent_at = now();
  select * into c from public.k1_user_contact(other);
  select * into pr from public.k1_notification_prefs where user_id = other;
  who := public.k1_user_name(new.sender_id);
  url := 'https://kalchuri.org/community/chat?room=' || r.id::text;
  txt := '💬 ' || who || ' ने आपको Kalchuri One पर संदेश भेजा है:' || E'\n\n' ||
         left(coalesce(nullif(btrim(new.body), ''), case when jsonb_array_length(new.media) > 0 then '📎 फोटो / फ़ाइल' else '' end), 200) ||
         E'\n\nपढ़ने और जवाब देने के लिए खोलें:\n' || url;
  if coalesce(pr.whatsapp, true) and coalesce(c.phone, '') <> '' then
    if public.k1_in_quiet_hours(other) then
      insert into public.k1_deferred_whatsapp (organization_id, user_id, phone, full_name, body, ref_table, ref) values (r.organization_id, other, c.phone, c.full_name, txt, 'cm_chat_dm', r.id);
    else perform public.k1_send(r.organization_id, 'whatsapp', c.phone, c.full_name, null, txt, 'cm_chat_dm', r.id); end if;
  elsif coalesce(pr.email, true) and coalesce(c.email, '') <> '' then
    perform public.k1_send(r.organization_id, 'email', c.email, c.full_name, '💬 ' || who || ' का संदेश', txt, 'cm_chat_dm', r.id);
  end if;
  return new;
exception when others then return new;   -- सूचना न जा सके तो भी संदेश ज़रूर सहेजा जाए
end $$;
do $x$ begin execute 'DR' || 'OP trigger if exists trg_cm_chat_dm_alert on public.cm_chat_messages'; end $x$;
create trigger trg_cm_chat_dm_alert after insert on public.cm_chat_messages for each row execute function public.trg_cm_chat_dm_alert();
