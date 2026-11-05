-- Kalchuri One · admin notifications (in-app bell + dashboard) and new-member alerts.
-- Owner's rule: every new membership request anywhere on the platform reaches the platform admins; Kalchuri One and
-- प्रगतिशील समाज are "priority" (shown first, ⭐ in WhatsApp). Org admins with org.member.approve get their own org's.

create table if not exists public.k1_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references core.organizations(id) on delete cascade,
  kind text not null,                       -- membership | organization | contact | letter | other
  title text not null,
  body text,
  link text,                                -- admin route, e.g. /admin/members
  priority smallint not null default 0,     -- 2 = priority organization, 1 = own org, 0 = other
  ref_table text, ref_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists k1_admin_notif_user_idx on public.k1_admin_notifications(user_id, read_at, created_at desc);
alter table public.k1_admin_notifications enable row level security;
create policy k1_admin_notif_own on public.k1_admin_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy k1_admin_notif_mark on public.k1_admin_notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- organizations whose new members the platform admins want to see first
create or replace function public.k1_priority_org(p_org uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from core.organizations o where o.id = p_org and (o.slug in ('kalchuri-one','pragatishil-kalar-samaj') or coalesce((o.branding->>'priority_alerts')::boolean, false)));
$$;

-- recipients: org team holding p_perm in p_org + every platform admin
create or replace function public.k1_admin_notify(p_org uuid, p_perm text, p_kind text, p_title text, p_body text, p_link text, p_ref_table text default null, p_ref uuid default null, p_whatsapp boolean default true)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record; pri smallint; txt text;
begin
  pri := case when public.k1_priority_org(p_org) then 2 else 0 end;
  for r in
    select distinct u from (
      select ra.user_id u from core.role_assignments ra join core.roles ro on ro.id = ra.role_id
       where ra.organization_id = p_org and (ra.valid_to is null or ra.valid_to >= current_date)
         and ro.permissions && array['*', split_part(p_perm, '.', 1) || '.*', p_perm]
      union select pa.user_id from core.platform_admins pa
    ) x
  loop
    insert into public.k1_admin_notifications(user_id, organization_id, kind, title, body, link, priority, ref_table, ref_id)
    values (r.u, p_org, p_kind, p_title, p_body, p_link, pri, p_ref_table, p_ref);
    n := n + 1;
  end loop;
  if p_whatsapp then
    txt := case when pri = 2 then '⭐ ' else '' end || p_title || coalesce(E'\n' || p_body, '') || coalesce(E'\n' || 'https://kalchuri.org' || p_link, '');
    -- organization's own channel (Kalchuri One → Admin → Messaging), if any
    begin perform public.k1_notify_org_admins(p_org, p_perm, txt, p_ref_table, p_ref); exception when others then null; end;
    -- owner's gateway (shokpatra app_settings.admin_notify_phone) so the platform admin always hears about it
    begin perform public.notify_admin_whatsapp(txt); exception when others then null; end;
  end if;
  return n;
end $$;
revoke execute on function public.k1_admin_notify(uuid, text, text, text, text, text, text, uuid, boolean) from public, anon, authenticated;

-- new membership request → alert
create or replace function public.trg_membership_alert() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = new.organization_id;
    perform public.k1_admin_notify(new.organization_id, 'org.member.approve', 'membership',
      '🙏 नया सदस्य: ' || coalesce(new.full_name_hi, new.full_name),
      coalesce(oname, '') || coalesce(' · ' || new.village, '') || coalesce(' · ' || new.mobile, '') || E'\n' || 'मंज़ूरी बाकी',
      '/admin/members', 'org_memberships', new.id);
  end if;
  return new;
end $$;
create trigger trg_membership_alert after insert on public.org_memberships for each row execute function public.trg_membership_alert();

-- new organization registration → platform admins (in-app; k1_org_register already sends WhatsApp)
create or replace function public.trg_org_registered_alert() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.k1_admin_notify(new.id, 'org.settings.edit', 'organization', '🏛️ नया संगठन पंजीकरण: ' || coalesce(new.name_hi, new.name), 'मंज़ूरी बाकी', '/admin/organizations', 'organizations', new.id, false);
  end if;
  return new;
end $$;
create trigger trg_org_registered_alert after insert on core.organizations for each row execute function public.trg_org_registered_alert();

-- contact messages: in-app too (WhatsApp already via trg_contact_alert)
create or replace function public.trg_contact_inapp() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.organization_id is not null then
    perform public.k1_admin_notify(new.organization_id, 'community.messages.manage', 'contact', '📩 संपर्क संदेश: ' || new.name, left(new.message, 160), '/admin/messages', 'contact_messages', new.id, false);
  end if;
  return new;
end $$;
create trigger trg_contact_inapp after insert on public.contact_messages for each row execute function public.trg_contact_inapp();

-- ---------- reading ----------
create or replace function public.k1_admin_notifications(p_limit int default 30)
returns table (id uuid, organization_id uuid, org_name text, kind text, title text, body text, link text, priority smallint, read_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select n.id, n.organization_id, coalesce(o.name_hi, o.name), n.kind, n.title, n.body, n.link, n.priority, n.read_at, n.created_at
  from public.k1_admin_notifications n left join core.organizations o on o.id = n.organization_id
  where n.user_id = auth.uid() order by n.read_at is null desc, n.created_at desc limit least(p_limit, 200);
$$;
grant execute on function public.k1_admin_notifications(int) to authenticated;

create or replace function public.k1_admin_unread() returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.k1_admin_notifications where user_id = auth.uid() and read_at is null;
$$;
grant execute on function public.k1_admin_unread() to authenticated;

create or replace function public.k1_admin_notifications_read(p_ids uuid[] default null) returns int language sql security definer set search_path = '' as $$
  with u as (update public.k1_admin_notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids)) returning 1)
  select count(*)::int from u;
$$;
grant execute on function public.k1_admin_notifications_read(uuid[]) to authenticated;

-- pending memberships the signed-in admin may decide: platform admin = every organization (priority ones first)
create or replace function public.k1_pending_memberships(p_limit int default 50)
returns table (id uuid, organization_id uuid, org_name text, org_slug text, priority boolean, full_name text, full_name_hi text, mobile text, village text, district text, category text, photo_path text, applied_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.id, m.organization_id, coalesce(o.name_hi, o.name), o.slug, public.k1_priority_org(o.id), m.full_name, m.full_name_hi, m.mobile, m.village, m.district, m.category, m.photo_path, m.applied_at
  from public.org_memberships m join core.organizations o on o.id = m.organization_id
  where m.status = 'pending' and (core.is_platform_admin() or core.can(m.organization_id, 'org.member.approve'))
  order by public.k1_priority_org(o.id) desc, m.applied_at asc limit least(p_limit, 500);
$$;
grant execute on function public.k1_pending_memberships(int) to authenticated;
