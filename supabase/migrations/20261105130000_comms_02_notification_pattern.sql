-- Kalchuri One · one notification pattern for the whole platform (owner, 2026-11-05):
--   every notification goes by EMAIL always (organization's own SMTP; until it adds one, the platform's SMTP sends on its
--   behalf) and by WHATSAPP when the organization (or the platform) has a WhatsApp channel; admin events also in-app (bell).
--   Organization admins are reminded weekly to add their own SMTP / WhatsApp until they do.
-- Matrix: docs/kalchuri-one/NOTIFICATIONS_HI.md

-- ---------- channel choice: own channel → platform (root) channel ----------
create or replace function public.k1_pick_channel(p_org uuid, p_kind text)
returns uuid language sql stable security definer set search_path = '' as $$
  select id from (
    select c.id, 0 as pri, c.is_default, c.created_at from public.comms_channels c where c.organization_id = p_org and c.kind = p_kind and c.status = 'active'
    union all
    select c.id, 1, c.is_default, c.created_at from public.comms_channels c
     where c.organization_id = coalesce(public.k1_root_org(p_org), p_org) and c.organization_id <> p_org and c.kind = p_kind and c.status = 'active'
  ) x order by pri, is_default desc, created_at limit 1;
$$;

-- does the organization have its OWN channel of this kind?
create or replace function public.k1_has_own_channel(p_org uuid, p_kind text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.comms_channels c where c.organization_id = p_org and c.kind = p_kind and c.status = 'active');
$$;
grant execute on function public.k1_has_own_channel(uuid, text) to authenticated;

-- ---------- low-level send: queue one message on the right channel ----------
create or replace function public.k1_send(p_org uuid, p_kind text, p_to text, p_name text, p_subject text, p_body text, p_ref_table text default null, p_ref uuid default null, p_purpose text default 'utility')
returns boolean language plpgsql security definer set search_path = '' as $$
declare ch uuid; dest text; oname text; sig text;
begin
  dest := public.k1_norm_contact(coalesce(p_to, ''));
  if dest = '' then return false; end if;
  if p_kind = 'email' and dest !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return false; end if;
  if p_kind = 'whatsapp' and dest !~ '^[0-9]{11,13}$' then return false; end if;
  ch := public.k1_pick_channel(p_org, p_kind);
  if ch is null then return false; end if;
  select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = p_org;
  sig := E'\n\n— ' || coalesce(oname, 'Kalchuri One') || E'\nKalchuri One · https://kalchuri.org';
  insert into public.comms_messages(organization_id, channel_id, kind, purpose, to_contact, to_name, subject, body, ref_table, ref_id)
  values (p_org, ch, p_kind, p_purpose, dest, p_name, case when p_kind = 'email' then coalesce(p_subject, 'सूचना') end, p_body || sig, p_ref_table, p_ref);
  return true;
end $$;
revoke execute on function public.k1_send(uuid, text, text, text, text, text, text, uuid, text) from public, anon, authenticated;

-- a user's best email / phone / name across auth, site profile, shokpatra profile and memberships
create or replace function public.k1_user_contact(p_user uuid)
returns table (email text, phone text, full_name text) language sql stable security definer set search_path = '' as $$
  select coalesce(u.email, sp.email, m.email), coalesce(sp.mobile, pr.phone, m.mobile, u.phone), coalesce(sp.full_name, pr.full_name, m.full_name, u.raw_user_meta_data->>'full_name', 'सदस्य')
    from auth.users u
    left join public.site_profiles sp on sp.id = u.id
    left join public.profiles pr on pr.id = u.id
    left join lateral (select om.email, om.mobile, om.full_name from public.org_memberships om where om.user_id = u.id order by om.status = 'active' desc, om.applied_at desc limit 1) m on true
   where u.id = p_user;
$$;
revoke execute on function public.k1_user_contact(uuid) from public, anon, authenticated;

-- notify ONE person (email + whatsapp); link is appended as a full URL
create or replace function public.k1_notify_user(p_org uuid, p_user uuid, p_subject text, p_body text, p_link text default null, p_ref_table text default null, p_ref uuid default null)
returns int language plpgsql security definer set search_path = '' as $$
declare c record; n int := 0; url text; txt text;
begin
  select * into c from public.k1_user_contact(p_user);
  if c is null then return 0; end if;
  url := case when p_link is null then '' when p_link like 'http%' then p_link else (select coalesce('https://' || d.hostname, 'https://kalchuri.org') from core.org_domains d where d.organization_id = p_org and d.is_primary order by d.created_at limit 1) || p_link end;
  if url is null then url := 'https://kalchuri.org' || p_link; end if;
  txt := p_subject || E'\n\n' || p_body || case when url <> '' then E'\n' || url else '' end;
  if public.k1_send(p_org, 'email', c.email, c.full_name, p_subject, p_body || case when url <> '' then E'\n\n' || url else '' end, p_ref_table, p_ref) then n := n + 1; end if;
  if public.k1_send(p_org, 'whatsapp', c.phone, c.full_name, null, txt, p_ref_table, p_ref) then n := n + 1; end if;
  return n;
end $$;
revoke execute on function public.k1_notify_user(uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- ---------- admin notify: in-app (bell) + email to every recipient + whatsapp ----------
create or replace function public.k1_admin_notify(p_org uuid, p_perm text, p_kind text, p_title text, p_body text, p_link text, p_ref_table text default null, p_ref uuid default null, p_whatsapp boolean default true)
returns int language plpgsql security definer set search_path = '' as $$
declare n int := 0; r record; pri smallint; txt text; c record; url text;
begin
  pri := case when public.k1_priority_org(p_org) then 2 else 0 end;
  url := 'https://kalchuri.org' || coalesce(p_link, '/admin');
  txt := case when pri = 2 then '⭐ ' else '' end || p_title || coalesce(E'\n' || p_body, '') || E'\n' || url;
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
    select * into c from public.k1_user_contact(r.u);
    if c is not null then
      perform public.k1_send(p_org, 'email', c.email, c.full_name, p_title, coalesce(p_body, '') || E'\n\n' || url, p_ref_table, p_ref);
    end if;
  end loop;
  if p_whatsapp then
    begin perform public.k1_notify_org_admins(p_org, p_perm, txt, p_ref_table, p_ref); exception when others then null; end;
    begin perform public.notify_admin_whatsapp(txt); exception when others then null; end;
  end if;
  return n;
end $$;

-- ---------- membership decided → applicant ----------
create or replace function public.trg_membership_decided_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text;
begin
  if tg_op = 'UPDATE' and old.status = 'applied' and new.status in ('active', 'rejected') and new.user_id is not null then
    select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = new.organization_id;
    if new.status = 'active' then
      perform public.k1_notify_user(new.organization_id, new.user_id, '🙏 ' || coalesce(oname, '') || ' — आपकी सदस्यता स्वीकृत',
        'नमस्ते ' || coalesce(new.full_name_hi, new.full_name) || ' जी,' || E'\n' || 'आपका सदस्यता आवेदन स्वीकार हो गया है।' || coalesce(' सदस्य क्रमांक: ' || new.member_no, '') || E'\n' || 'अपना डिजिटल सदस्यता कार्ड, वंश वृक्ष और समुदाय अब आपके खाते में खुले हैं।',
        '/account', 'org_memberships', new.id);
    else
      perform public.k1_notify_user(new.organization_id, new.user_id, coalesce(oname, '') || ' — सदस्यता आवेदन पर निर्णय',
        'नमस्ते ' || coalesce(new.full_name_hi, new.full_name) || ' जी,' || E'\n' || 'क्षमा करें, आपका सदस्यता आवेदन इस समय स्वीकार नहीं हो सका।' || coalesce(E'\n' || 'कारण: ' || new.admin_note, '') || E'\n' || 'सुधार कर दोबारा आवेदन कर सकते हैं या संगठन से संपर्क करें।',
        '/contact', 'org_memberships', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger trg_membership_decided_notify after update of status on public.org_memberships for each row execute function public.trg_membership_decided_notify();

-- ---------- role assigned → the person (+ SMTP/WhatsApp setup reminder for org admins) ----------
create or replace function public.trg_role_assigned_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text; rname text; perms text[]; extra text := '';
begin
  select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = new.organization_id;
  select coalesce(r.name_hi, r.name), r.permissions into rname, perms from core.roles r where r.id = new.role_id;
  if perms && array['*', 'org.*', 'org.settings.edit'] then
    if not public.k1_has_own_channel(new.organization_id, 'email') or not public.k1_has_own_channel(new.organization_id, 'whatsapp') then
      extra := E'\n\n' || 'ज़रूरी: अभी आपकी संस्था की ईमेल सूचनाएँ Kalchuri One के ईमेल से जा रही हैं। अपना SMTP (ईमेल) और WhatsApp channel जोड़ें — Admin → पत्राचार व संदेश → Messaging। जब तक नहीं जोड़ते, हर सप्ताह यह याद दिलाया जाएगा।';
    end if;
  end if;
  perform public.k1_notify_user(new.organization_id, new.user_id, coalesce(oname, '') || ' — आपको भूमिका मिली: ' || coalesce(rname, ''),
    'आपको ' || coalesce(oname, '') || ' में "' || coalesce(rname, '') || '" की भूमिका दी गई है।' || coalesce(' कार्यकाल ' || to_char(new.valid_to, 'DD.MM.YYYY') || ' तक।', '') || E'\n' || 'Admin panel: लॉगिन करके ऊपर "Admin" चुनें।' || extra,
    '/admin', 'role_assignments', new.id);
  return new;
end $$;
create trigger trg_role_assigned_notify after insert on core.role_assignments for each row execute function public.trg_role_assigned_notify();

-- ---------- organization decided → its admins ----------
create or replace function public.trg_org_decided_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare r record; host text;
begin
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'active' then
    select d.hostname into host from core.org_domains d where d.organization_id = new.id order by d.is_primary desc, d.created_at limit 1;
    for r in select distinct ra.user_id from core.role_assignments ra where ra.organization_id = new.id loop
      perform public.k1_notify_user(new.id, r.user_id, '🏛️ ' || coalesce(new.name_hi, new.name) || ' — संगठन स्वीकृत',
        'आपका संगठन Kalchuri One पर स्वीकृत हो गया है।' || coalesce(E'\n' || 'वेबसाइट: https://' || host, '') || E'\n\n' || 'अगले कदम (Admin panel में):' || E'\n' || '1. Organization settings — logo, परिचय, पता' || E'\n' || '2. Messaging — अपना SMTP (ईमेल) और WhatsApp channel' || E'\n' || '3. Homepage — स्लाइडर और sections' || E'\n' || '4. Team & roles — पदाधिकारी',
        '/admin', 'organizations', new.id);
    end loop;
  end if;
  return new;
end $$;
create trigger trg_org_decided_notify after update of status on core.organizations for each row execute function public.trg_org_decided_notify();

-- ---------- shok letters: pending approval → family admins (in-app + email); decision → creator (email) ----------
create or replace function public.trg_letter_notify_k1() returns trigger language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if tg_op = 'UPDATE' and new.organization_id is not null then
    if new.status = 'pending_approval' and old.status is distinct from 'pending_approval' then
      select count(*) into n from public.letter_recipients lr where lr.letter_id = new.id;
      perform public.k1_admin_notify(new.organization_id, 'shok.approve', 'letter', '🪔 शोक संदेश — मंज़ूरी बाकी: ' || coalesce(new.deceased_name, ''),
        n || ' लोगों को भेजने के लिए जमा किया गया।', '/admin/shok', 'letters', new.id, false);
    elsif old.status = 'pending_approval' and new.status in ('queued', 'rejected') and new.created_by is not null then
      perform public.k1_notify_user(new.organization_id, new.created_by,
        case when new.status = 'queued' then '🪔 शोक संदेश मंज़ूर — भेजना शुरू' else 'शोक संदेश अस्वीकार' end || ': ' || coalesce(new.deceased_name, ''),
        case when new.status = 'queued' then 'आपका शोक संदेश मंज़ूर हो गया; सर्वर कतार से भेजना शुरू कर रहा है।' else 'आपका शोक संदेश मंज़ूर नहीं हुआ।' || coalesce(E'\n' || 'कारण: ' || new.admin_note, '') end,
        '/admin/shok', 'letters', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger trg_letter_notify_k1 after update of status on public.letters for each row execute function public.trg_letter_notify_k1();

-- ---------- matrimony: interest shown / accepted → the other side ----------
create or replace function public.trg_matrimony_interest_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare t record; f record;
begin
  select p.user_id, p.organization_id, p.display_name into t from public.cm_matrimony_profiles p where p.id = new.to_profile;
  select p.user_id, p.display_name into f from public.cm_matrimony_profiles p where p.id = new.from_profile;
  if tg_op = 'INSERT' and t.user_id is not null then
    perform public.k1_notify_user(t.organization_id, t.user_id, '💍 वैवाहिक — नई रुचि', coalesce(f.display_name, 'एक सदस्य') || ' ने ' || coalesce(t.display_name, 'आपके प्रोफ़ाइल') || ' में रुचि दिखाई है। स्वीकार करने पर दोनों के संपर्क साझा होंगे।', '/matrimony', 'cm_matrimony_interests', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' and f.user_id is not null then
    perform public.k1_notify_user(t.organization_id, f.user_id, '💍 वैवाहिक — रुचि स्वीकार', coalesce(t.display_name, 'सदस्य') || ' ने आपकी रुचि स्वीकार की। अब वैवाहिक पेज पर संपर्क देख सकते हैं।', '/matrimony', 'cm_matrimony_interests', new.id);
  end if;
  return new;
end $$;
create trigger trg_matrimony_interest_notify after insert or update of status on public.cm_matrimony_interests for each row execute function public.trg_matrimony_interest_notify();

-- ---------- weekly reminder: organizations without their own SMTP / WhatsApp ----------
create or replace function public.k1_channel_reminders() returns int language plpgsql security definer set search_path = '' as $$
declare o record; n int := 0; missing text;
begin
  for o in select id, name, name_hi from core.organizations where status = 'active' and parent_id is not null loop
    missing := concat_ws(' और ', case when not public.k1_has_own_channel(o.id, 'email') then 'SMTP (ईमेल)' end, case when not public.k1_has_own_channel(o.id, 'whatsapp') then 'WhatsApp' end);
    if missing <> '' then
      perform public.k1_admin_notify(o.id, 'org.settings.edit', 'setup', '🔔 ' || coalesce(o.name_hi, o.name) || ' — अपना ' || missing || ' channel जोड़ें',
        'अभी आपकी संस्था की सूचनाएँ Kalchuri One के साझा channel से जा रही हैं। अपना channel जोड़ने पर संदेश आपकी संस्था के नाम/ईमेल से जाएँगे। Admin → पत्राचार व संदेश → Messaging।', '/admin/messaging', 'organizations', o.id, false);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_channel_reminders() from public, anon, authenticated;
select cron.schedule('k1-channel-reminders', '30 3 * * 1', $$select public.k1_channel_reminders()$$);
