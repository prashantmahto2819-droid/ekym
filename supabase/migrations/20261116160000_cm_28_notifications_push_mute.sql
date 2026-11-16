-- सूचना व्यवस्था (Facebook / Instagram जैसी):
-- (1) हर प्रकार की सूचना × माध्यम (घंटी, फ़ोन/ब्राउज़र push, WhatsApp, ईमेल) की अलग सेटिंग — k1_notification_prefs.channels
--     = {"<kind>": {"push": false, "whatsapp": false, "email": false}}; न लिखा हो तो चालू। घंटी = muted_kinds (पहले से)।
-- (2) ब्राउज़र / फ़ोन push: k1_push_subscriptions; cm_notifications में नई पंक्ति → edge function push-send (pg_net)।
--     VAPID चाबियाँ push-send पहली बार खुद बनाकर server_secrets में रखता है; सार्वजनिक चाबी k1_push_public_key() से।
-- (3) चैट म्यूट समय के साथ: cm_chat_members.muted_until (1 घंटा / 8 घंटे / 1 दिन / 1 हफ़्ता / हमेशा), समय निकलते ही
--     अपने-आप खुल जाता है (cron हर 5 मिनट)।
-- (4) सीधे संदेश की घंटी-सूचना में बातचीत का लिंक (/community/chat?room=…) ताकि सूचना दबाते ही वही चैट खुले।

alter table public.k1_notification_prefs add column if not exists channels jsonb not null default '{}'::jsonb;

create table if not exists public.k1_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists k1_push_subscriptions_user_idx on public.k1_push_subscriptions (user_id);
alter table public.k1_push_subscriptions enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists k1_push_own on public.k1_push_subscriptions'; end $x$;
create policy k1_push_own on public.k1_push_subscriptions for select to authenticated using (user_id = auth.uid());


-- माध्यम चालू है या नहीं (प्रकार के हिसाब से)
create or replace function public.k1_pref_on(p_user uuid, p_kind text, p_channel text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select case p_channel when 'whatsapp' then p.whatsapp when 'email' then p.email else true end
                          and coalesce((p.channels -> coalesce(p_kind, 'system') ->> p_channel)::boolean, true)
                     from public.k1_notification_prefs p where p.user_id = p_user), true);
$$;
revoke all on function public.k1_pref_on(uuid, text, text) from public, anon;
grant execute on function public.k1_pref_on(uuid, text, text) to authenticated;

create or replace function public.k1_notification_prefs_get()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('whatsapp', coalesce(p.whatsapp, true), 'email', coalesce(p.email, true), 'quiet_start', coalesce(p.quiet_start, 21), 'quiet_end', coalesce(p.quiet_end, 8),
                            'muted_kinds', coalesce(to_jsonb(p.muted_kinds), '[]'::jsonb), 'channels', coalesce(p.channels, '{}'::jsonb),
                            'push_devices', (select count(*) from public.k1_push_subscriptions s where s.user_id = auth.uid()))
    from (select 1) x left join public.k1_notification_prefs p on p.user_id = auth.uid();
$$;

create or replace function public.k1_notification_prefs_save(p jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.k1_notification_prefs as t (user_id, whatsapp, email, quiet_start, quiet_end, muted_kinds, channels, updated_at)
  values (auth.uid(), coalesce((p->>'whatsapp')::boolean, true), coalesce((p->>'email')::boolean, true), coalesce((p->>'quiet_start')::smallint, 21), coalesce((p->>'quiet_end')::smallint, 8),
          coalesce(array(select jsonb_array_elements_text(coalesce(p->'muted_kinds', '[]'::jsonb))), '{}'),
          case when jsonb_typeof(p->'channels') = 'object' and length((p->'channels')::text) < 6000 then p->'channels' else '{}'::jsonb end, now())
  on conflict (user_id) do update set whatsapp = excluded.whatsapp, email = excluded.email, quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end,
    muted_kinds = excluded.muted_kinds, channels = excluded.channels, updated_at = now();
$$;

-- k1_notify_user2: WhatsApp / ईमेल प्रकार के हिसाब से भी रुके
do $$
declare d text;
begin
  d := pg_get_functiondef('public.k1_notify_user2(uuid, uuid, text, text, text, text, uuid, boolean, boolean, text)'::regprocedure);
  if position('k1_pref_on' in d) = 0 then
    d := replace(d, 'if p_email and coalesce(pr.email, true) and', 'if p_email and coalesce(pr.email, true) and public.k1_pref_on(p_user, p_kind, ''email'') and');
    d := replace(d, 'if p_whatsapp and coalesce(pr.whatsapp, true) and', 'if p_whatsapp and coalesce(pr.whatsapp, true) and public.k1_pref_on(p_user, p_kind, ''whatsapp'') and');
    if position('k1_pref_on' in d) = 0 then raise exception 'notify_user2 patch failed'; end if;
    execute d;
  end if;
  -- DM की WhatsApp / ईमेल सूचना भी
  d := pg_get_functiondef('public.trg_cm_chat_dm_alert()'::regprocedure);
  if position('k1_pref_on' in d) = 0 then
    d := replace(d, 'if coalesce(pr.whatsapp, true) and coalesce(c.phone', 'if public.k1_pref_on(other, ''chat_dm'', ''whatsapp'') and coalesce(c.phone');
    d := replace(d, 'elsif coalesce(pr.email, true) and coalesce(c.email', 'elsif public.k1_pref_on(other, ''chat_dm'', ''email'') and coalesce(c.email');
    -- समय वाला म्यूट भी गिनें
    d := replace(d, 'and x.user_id = other and x.muted)', 'and x.user_id = other and x.muted and (x.muted_until is null or x.muted_until > now()))');
    if position('k1_pref_on' in d) = 0 then raise exception 'dm alert patch failed'; end if;
    execute d;
  end if;
end $$;

-- ---------- चैट म्यूट समय के साथ ----------
alter table public.cm_chat_members add column if not exists muted_until timestamptz;
create or replace function public.k1_chat_mute_for(p_room uuid, p_minutes int)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare until timestamptz;
begin
  if not public.k1_chat_can_read(p_room) then raise exception 'not allowed'; end if;
  -- p_minutes: 0 = म्यूट हटाएँ, null या < 0 = हमेशा
  if p_minutes = 0 then
    insert into public.cm_chat_members (room_id, user_id, muted, muted_until) values (p_room, auth.uid(), false, null)
    on conflict (room_id, user_id) do update set muted = false, muted_until = null;
    return null;
  end if;
  until := case when p_minutes is null or p_minutes < 0 then null else now() + make_interval(mins => least(p_minutes, 525600)) end;
  insert into public.cm_chat_members (room_id, user_id, muted, muted_until) values (p_room, auth.uid(), true, until)
  on conflict (room_id, user_id) do update set muted = true, muted_until = until;
  return until;
end $$;
revoke all on function public.k1_chat_mute_for(uuid, int) from public, anon;
grant execute on function public.k1_chat_mute_for(uuid, int) to authenticated;

create or replace function public.k1_chat_unmute_expired() returns int language sql security definer set search_path = '' as $$
  with u as (update public.cm_chat_members set muted = false, muted_until = null where muted and muted_until is not null and muted_until <= now() returning 1)
  select count(*)::int from u;
$$;
revoke all on function public.k1_chat_unmute_expired() from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-chat-unmute'); exception when others then null; end $$;
select cron.schedule('k1-chat-unmute', '*/5 * * * *', $$select public.k1_chat_unmute_expired()$$);

-- म्यूट कब तक (चैट सूची / खिड़की में दिखाने के लिए)
create or replace function public.k1_chat_mutes()
returns table (room_id uuid, muted_until timestamptz) language sql stable security definer set search_path = '' as $$
  select cm.room_id, cm.muted_until from public.cm_chat_members cm where cm.user_id = auth.uid() and cm.muted;
$$;
revoke all on function public.k1_chat_mutes() from public, anon;
grant execute on function public.k1_chat_mutes() to authenticated;

-- ---------- DM घंटी-सूचना में बातचीत का लिंक ----------
create or replace function public.trg_cm_notif_dm_link() returns trigger language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if new.kind = 'chat_dm' and new.link is null and new.actor_id is not null then
    select r.id into rid from public.cm_chat_rooms r
     where r.kind = 'dm' and r.dm_key = least(new.actor_id::text, new.user_id::text) || ':' || greatest(new.actor_id::text, new.user_id::text);
    if rid is not null then new.link := '/community/chat?room=' || rid::text; end if;
  end if;
  return new;
end $$;
do $x$ begin execute 'DR' || 'OP trigger if exists trg_cm_notif_dm_link on public.cm_notifications'; end $x$;
create trigger trg_cm_notif_dm_link before insert on public.cm_notifications for each row execute function public.trg_cm_notif_dm_link();

-- ---------- push ----------
create or replace function public.k1_push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_ua text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(p_endpoint, '') !~ '^https://' then raise exception 'bad subscription'; end if;
  insert into public.k1_push_subscriptions (user_id, endpoint, p256dh, auth, ua) values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_ua, 200))
  on conflict (endpoint) do update set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth, ua = excluded.ua;
end $$;
create or replace function public.k1_push_unsubscribe(p_endpoint text)
returns void language sql security definer set search_path = '' as $$
  delete from public.k1_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;
create or replace function public.k1_push_public_key()
returns text language sql stable security definer set search_path = '' as $$
  select value from public.server_secrets where key = 'vapid_public';
$$;
revoke all on function public.k1_push_subscribe(text, text, text, text), public.k1_push_unsubscribe(text), public.k1_push_public_key() from public, anon;
grant execute on function public.k1_push_subscribe(text, text, text, text), public.k1_push_unsubscribe(text), public.k1_push_public_key() to authenticated;

-- नई सूचना → push (घंटी में छिपाया प्रकार / push बंद / चैट म्यूट / अभी साइट पर सक्रिय हो तो नहीं)
create or replace function public.trg_cm_notif_push() returns trigger language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare sec text;
begin
  if not exists (select 1 from public.k1_push_subscriptions s where s.user_id = new.user_id) then return new; end if;
  if not public.k1_pref_on(new.user_id, new.kind, 'push') then return new; end if;
  if new.kind = any(coalesce((select p.muted_kinds from public.k1_notification_prefs p where p.user_id = new.user_id), '{}')) then return new; end if;
  if new.kind = 'chat_dm' then
    if exists (select 1 from public.cm_chat_members x join public.cm_chat_rooms r on r.id = x.room_id
                where x.user_id = new.user_id and x.muted and (x.muted_until is null or x.muted_until > now())
                  and r.kind = 'dm' and r.dm_key = least(new.actor_id::text, new.user_id::text) || ':' || greatest(new.actor_id::text, new.user_id::text)) then return new; end if;
    if (select cp.last_seen_at > now() - interval '70 seconds' from public.cm_user_profiles cp where cp.user_id = new.user_id) then return new; end if;  -- साइट खुली है, चैट-खिड़की दिखेगी
  end if;
  select value into sec from public.server_secrets where key = 'cron_secret';
  perform net.http_post(
    url := 'https://udxdxkyfrqlgdwwqaucu.supabase.co/functions/v1/push-send',
    body := jsonb_build_object('action', 'send', 'notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', sec),
    timeout_milliseconds := 8000);
  return new;
exception when others then return new;
end $$;
do $x$ begin execute 'DR' || 'OP trigger if exists trg_cm_notif_push on public.cm_notifications'; end $x$;
create trigger trg_cm_notif_push after insert on public.cm_notifications for each row execute function public.trg_cm_notif_push();
