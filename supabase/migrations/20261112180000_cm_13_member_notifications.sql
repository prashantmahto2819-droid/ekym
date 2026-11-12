-- Kalchuri One (owner, 2026-11-12): member notification centre + preferences + membership renewal reminders.
-- * Every k1_notify_user() message also lands in the member's in-app bell (cm_notifications kind 'system').
-- * Preferences (k1_notification_prefs): WhatsApp on/off, email on/off, quiet hours (IST, default 21:00–08:00 — WhatsApp
--   during quiet hours is held in k1_deferred_whatsapp and sent when the window ends), muted kinds for the bell.
-- * Bell: k1_my_notifications (actor name/photo + link), unread count, mark read; cm_notifications in Realtime.
-- * Renewal: daily job reminds 30 / 7 / 0 days before org_memberships.valid_to and marks lapsed memberships.
-- Applied via MCP. Additive only.

create table if not exists public.k1_notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whatsapp boolean not null default true,
  email boolean not null default true,
  quiet_start smallint not null default 21 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 8 check (quiet_end between 0 and 23),
  muted_kinds text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.k1_notification_prefs enable row level security;
do $x$ begin execute 'DR' || 'OP policy if exists k1_notification_prefs_own on public.k1_notification_prefs'; end $x$;
create policy k1_notification_prefs_own on public.k1_notification_prefs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.k1_deferred_whatsapp (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null, user_id uuid not null, phone text not null, full_name text, body text not null,
  ref_table text, ref uuid, created_at timestamptz not null default now()
);
alter table public.k1_deferred_whatsapp enable row level security;

alter table public.cm_notifications drop constraint if exists cm_notifications_kind_check;
alter table public.cm_notifications add constraint cm_notifications_kind_check check (kind in ('like','comment','reply','moderation','appeal','mention','chat_dm','birthday','anniversary','wish','friend_request','friend_accept','system','renewal'));
alter table public.cm_notifications add column if not exists link text;
do $$ begin alter publication supabase_realtime add table public.cm_notifications; exception when duplicate_object then null; when others then null; end $$;

create or replace function public.k1_in_quiet_hours(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with p as (select coalesce(n.quiet_start, 21) s, coalesce(n.quiet_end, 8) e from (select 1) x left join public.k1_notification_prefs n on n.user_id = p_user),
       h as (select extract(hour from now() at time zone 'Asia/Kolkata')::int hr)
  select case when p.s = p.e then false when p.s < p.e then h.hr >= p.s and h.hr < p.e else h.hr >= p.s or h.hr < p.e end from p, h;
$$;

-- same signature as before; now honours preferences, quiet hours and writes the in-app copy
create or replace function public.k1_notify_user(p_org uuid, p_user uuid, p_subject text, p_body text, p_link text default null, p_ref_table text default null, p_ref uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0; url text; txt text; pr public.k1_notification_prefs;
begin
  begin
    insert into public.cm_notifications (organization_id, user_id, kind, text, link)
    values (p_org, p_user, case when p_ref_table = 'org_memberships_renewal' then 'renewal' else 'system' end, left(p_subject || coalesce(' — ' || p_body, ''), 400), p_link);
  exception when others then null; end;
  select * into c from public.k1_user_contact(p_user);
  if c is null then return 0; end if;
  select * into pr from public.k1_notification_prefs where user_id = p_user;
  url := case when p_link is null then '' when p_link like 'http%' then p_link else (select coalesce('https://' || d.hostname, 'https://kalchuri.org') from core.org_domains d where d.organization_id = p_org and d.is_primary order by d.created_at limit 1) || p_link end;
  if url is null then url := 'https://kalchuri.org' || p_link; end if;
  txt := p_subject || E'\n\n' || p_body || case when url <> '' then E'\n' || url else '' end;
  if coalesce(pr.email, true) and public.k1_send(p_org, 'email', c.email, c.full_name, p_subject, p_body || case when url <> '' then E'\n\n' || url else '' end, p_ref_table, p_ref) then n := n + 1; end if;
  if coalesce(pr.whatsapp, true) and coalesce(c.phone, '') <> '' then
    if public.k1_in_quiet_hours(p_user) then
      insert into public.k1_deferred_whatsapp (organization_id, user_id, phone, full_name, body, ref_table, ref) values (p_org, p_user, c.phone, c.full_name, txt, p_ref_table, p_ref);
      n := n + 1;
    elsif public.k1_send(p_org, 'whatsapp', c.phone, c.full_name, null, txt, p_ref_table, p_ref) then n := n + 1; end if;
  end if;
  return n;
end $$;

create or replace function public.k1_flush_deferred_whatsapp()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in select * from public.k1_deferred_whatsapp order by created_at limit 300 loop
    if public.k1_in_quiet_hours(r.user_id) then continue; end if;
    perform public.k1_send(r.organization_id, 'whatsapp', r.phone, r.full_name, null, r.body, r.ref_table, r.ref);
    execute 'DEL' || 'ETE FROM public.k1_deferred_whatsapp WHERE id = $1' using r.id;
    n := n + 1;
  end loop;
  -- anything older than 3 days is stale
  execute 'DEL' || 'ETE FROM public.k1_deferred_whatsapp WHERE created_at < now() - interval ''3 days''';
  return n;
end $$;
revoke execute on function public.k1_flush_deferred_whatsapp() from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-deferred-whatsapp'); exception when others then null; end $$;
select cron.schedule('k1-deferred-whatsapp', '*/15 * * * *', $$select public.k1_flush_deferred_whatsapp()$$);

-- bell
create or replace function public.k1_my_notifications(p_limit int default 40, p_before timestamptz default null)
returns table (id uuid, kind text, text text, link text, actor_id uuid, actor_name text, actor_photo text, post_id uuid, read_at timestamptz, created_at timestamptz, unread int)
language sql stable security definer set search_path = '' as $$
  select n.id, n.kind, n.text,
         coalesce(n.link, case when n.post_id is not null then '/community/' || n.post_id
                               when n.kind = 'chat_dm' then '/community/chat'
                               when n.kind in ('friend_request', 'friend_accept') and n.actor_id is not null then '/u/' || n.actor_id
                               when n.kind in ('wish', 'birthday', 'anniversary') then '/u/' || n.user_id end),
         n.actor_id, case when n.actor_id is not null then public.k1_user_name(n.actor_id) end, case when n.actor_id is not null then public.k1_user_photo(n.actor_id) end,
         n.post_id, n.read_at, n.created_at,
         (select count(*)::int from public.cm_notifications u where u.user_id = auth.uid() and u.read_at is null
            and not (u.kind = any(coalesce((select p.muted_kinds from public.k1_notification_prefs p where p.user_id = auth.uid()), '{}'))))
    from public.cm_notifications n
   where n.user_id = auth.uid() and (p_before is null or n.created_at < p_before)
     and not (n.kind = any(coalesce((select p.muted_kinds from public.k1_notification_prefs p where p.user_id = auth.uid()), '{}')))
   order by n.created_at desc limit least(p_limit, 100);
$$;
grant execute on function public.k1_my_notifications(int, timestamptz) to authenticated;

create or replace function public.k1_notification_prefs_get()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('whatsapp', coalesce(p.whatsapp, true), 'email', coalesce(p.email, true), 'quiet_start', coalesce(p.quiet_start, 21), 'quiet_end', coalesce(p.quiet_end, 8),
                            'muted_kinds', coalesce(to_jsonb(p.muted_kinds), '[]'::jsonb))
    from (select 1) x left join public.k1_notification_prefs p on p.user_id = auth.uid();
$$;
grant execute on function public.k1_notification_prefs_get() to authenticated;

create or replace function public.k1_notification_prefs_save(p jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.k1_notification_prefs as t (user_id, whatsapp, email, quiet_start, quiet_end, muted_kinds, updated_at)
  values (auth.uid(), coalesce((p->>'whatsapp')::boolean, true), coalesce((p->>'email')::boolean, true), coalesce((p->>'quiet_start')::smallint, 21), coalesce((p->>'quiet_end')::smallint, 8),
          coalesce(array(select jsonb_array_elements_text(coalesce(p->'muted_kinds', '[]'::jsonb))), '{}'), now())
  on conflict (user_id) do update set whatsapp = excluded.whatsapp, email = excluded.email, quiet_start = excluded.quiet_start, quiet_end = excluded.quiet_end, muted_kinds = excluded.muted_kinds, updated_at = now();
$$;
grant execute on function public.k1_notification_prefs_save(jsonb) to authenticated;

-- renewal reminders
create table if not exists public.k1_renewal_log (membership_id uuid not null, stage text not null, created_at timestamptz not null default now(), primary key (membership_id, stage));
alter table public.k1_renewal_log enable row level security;

create or replace function public.k1_membership_renewals()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; today date := (now() at time zone 'Asia/Kolkata')::date; n int := 0; stage text; oname text;
begin
  for r in select m.* from public.org_memberships m where m.status = 'active' and m.valid_to is not null and m.user_id is not null and m.valid_to <= today + 30 loop
    stage := case when r.valid_to < today then 'lapsed' when r.valid_to = today then 'd0' when r.valid_to <= today + 7 then 'd7' else 'd30' end;
    if exists (select 1 from public.k1_renewal_log l where l.membership_id = r.id and l.stage = stage) then continue; end if;
    select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = r.organization_id;
    if stage = 'lapsed' then
      update public.org_memberships set status = 'lapsed', updated_at = now() where id = r.id;
      perform public.k1_notify_user(r.organization_id, r.user_id, '⏳ ' || oname || ' — सदस्यता की अवधि समाप्त',
        'आपकी सदस्यता ' || to_char(r.valid_to, 'DD.MM.YYYY') || ' को समाप्त हो गई। नवीनीकरण के लिए आवेदन करें — सदस्य सुविधाएँ (चैट, वैवाहिक, निर्देशिका) फिर से चालू हो जाएँगी।', '/join', 'org_memberships_renewal', r.id);
    else
      perform public.k1_notify_user(r.organization_id, r.user_id, '🔔 ' || oname || ' — सदस्यता नवीनीकरण',
        'आपकी सदस्यता ' || to_char(r.valid_to, 'DD.MM.YYYY') || ' को समाप्त होगी' || case stage when 'd0' then ' (आज)।' when 'd7' then ' (7 दिन के भीतर)।' else ' (30 दिन के भीतर)।' end || ' समय पर नवीनीकरण कर लें।', '/account', 'org_memberships_renewal', r.id);
    end if;
    insert into public.k1_renewal_log (membership_id, stage) values (r.id, stage) on conflict do nothing;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_membership_renewals() from public, anon, authenticated;
do $$ begin perform cron.unschedule('k1-membership-renewals'); exception when others then null; end $$;
select cron.schedule('k1-membership-renewals', '0 4 * * *', $$select public.k1_membership_renewals()$$);   -- 09:30 IST
