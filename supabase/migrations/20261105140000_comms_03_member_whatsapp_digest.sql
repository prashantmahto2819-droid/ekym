-- Kalchuri One · (owner, 2026-11-05) the member must hear on OUR WhatsApp when their account is approved — on Kalchuri One
-- or in shokpatra — and when a task / responsibility is given; admins get a twice-daily digest of what is new.
-- Times chosen: 08:30 IST and 18:30 IST (03:00 / 13:00 UTC); shokpatra's own family digest stays at 09:30 / 18:30 IST.

-- ---------- owner's gateway to ANY number (same relay as notify_admin_whatsapp) ----------
create or replace function public.shok_send_whatsapp(p_phone text, p_text text)
returns boolean language plpgsql security definer set search_path = 'public', 'extensions' as $$
declare cfg jsonb; relay text; phone text;
begin
  select jsonb_object_agg(key, coalesce(value, '')) into cfg from public.app_settings;
  relay := regexp_replace(coalesce(cfg->>'relay_url', ''), '/+$', '');
  phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(phone) = 10 then phone := '91' || phone; end if;
  if relay = '' or coalesce(cfg->>'relay_key', '') = '' or coalesce(cfg->>'relay_session', '') = '' or phone !~ '^[0-9]{11,13}$' then return false; end if;
  perform net.http_post(
    url := relay || '/api/sessions/' || (cfg->>'relay_session') || '/send',
    body := jsonb_build_object('to', phone, 'text', p_text),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (cfg->>'relay_key'), 'X-Requested-With', 'vivid'));
  return true;
exception when others then return false;
end $$;
revoke execute on function public.shok_send_whatsapp(text, text) from public, anon, authenticated;

-- k1_send: WhatsApp with no channel anywhere → owner's gateway directly (so members always hear from "our WhatsApp")
create or replace function public.k1_send(p_org uuid, p_kind text, p_to text, p_name text, p_subject text, p_body text, p_ref_table text default null, p_ref uuid default null, p_purpose text default 'utility')
returns boolean language plpgsql security definer set search_path = '' as $$
declare ch uuid; dest text; oname text; sig text;
begin
  dest := public.k1_norm_contact(coalesce(p_to, ''));
  if dest = '' then return false; end if;
  if p_kind = 'email' and dest !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return false; end if;
  if p_kind = 'whatsapp' and dest !~ '^[0-9]{11,13}$' then return false; end if;
  select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = p_org;
  sig := E'\n\n— ' || coalesce(oname, 'Kalchuri One') || E'\nKalchuri One · https://kalchuri.org';
  ch := public.k1_pick_channel(p_org, p_kind);
  if ch is null then
    if p_kind = 'whatsapp' then return public.shok_send_whatsapp(dest, p_body || sig); end if;
    return false;
  end if;
  insert into public.comms_messages(organization_id, channel_id, kind, purpose, to_contact, to_name, subject, body, ref_table, ref_id)
  values (p_org, ch, p_kind, p_purpose, dest, p_name, case when p_kind = 'email' then coalesce(p_subject, 'सूचना') end, p_body || sig, p_ref_table, p_ref);
  return true;
end $$;

-- ---------- no double message when the two approvals sync each other ----------
create or replace function public.trg_membership_decided_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text;
begin
  if current_setting('k1.sync', true) = '1' then return new; end if;
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

-- shokpatra account approved / rejected → the person (owner's WhatsApp + email when available)
create or replace function public.trg_profile_decided_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  if current_setting('k1.sync', true) = '1' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('approved', 'rejected') then
    org := coalesce((select m.organization_id from public.org_memberships m where m.user_id = new.id order by m.status = 'active' desc, m.applied_at desc limit 1),
                    (select id from core.organizations where slug = 'pragatishil-kalar-samaj'));
    if new.status = 'approved' then
      perform public.k1_notify_user(org, new.id, '🙏 शोकपत्र सेवा — आपका खाता मंज़ूर',
        'नमस्ते ' || coalesce(new.full_name, '') || ' जी,' || E'\n' || 'आपका खाता मंज़ूर हो गया है। अब आप परिवार (वंश वृक्ष) बना सकते हैं, नाम सुझा सकते हैं और शोकपत्र भेज सकते हैं।',
        'https://shokpatra.kalchuri.org/app.html', 'profiles', new.id);
    else
      perform public.k1_notify_user(org, new.id, 'शोकपत्र सेवा — खाते पर निर्णय',
        'नमस्ते ' || coalesce(new.full_name, '') || ' जी,' || E'\n' || 'क्षमा करें, आपका खाता इस समय मंज़ूर नहीं हो सका।' || coalesce(E'\n' || 'कारण: ' || new.admin_note, '') || E'\n' || 'अपने गाँव के एडमिन से संपर्क करें।',
        'https://shokpatra.kalchuri.org/', 'profiles', new.id);
    end if;
  end if;
  return new;
end $$;
create trigger trg_profile_decided_notify after update of status on public.profiles for each row execute function public.trg_profile_decided_notify();

-- ---------- task / responsibility given → assignee ----------
create or replace function public.trg_task_assigned_notify() returns trigger language plpgsql security definer set search_path = '' as $$
declare oname text;
begin
  if new.assignee_user_id is not null and (tg_op = 'INSERT' or old.assignee_user_id is distinct from new.assignee_user_id) and new.status not in ('done', 'cancelled') then
    select coalesce(o.name_hi, o.name) into oname from core.organizations o where o.id = new.organization_id;
    perform public.k1_notify_user(new.organization_id, new.assignee_user_id, '📝 ' || coalesce(oname, '') || ' — नई ज़िम्मेदारी: ' || new.title,
      coalesce(new.detail, '') || coalesce(E'\n' || 'अंतिम तिथि: ' || to_char(new.due_date, 'DD.MM.YYYY'), '') || coalesce(E'\n' || 'प्राथमिकता: ' || new.priority, ''),
      '/admin/tasks', 'gov_tasks', new.id);
  end if;
  return new;
end $$;
create trigger trg_task_assigned_notify after insert or update of assignee_user_id on public.gov_tasks for each row execute function public.trg_task_assigned_notify();

-- ---------- twice-daily digest for admins: what is new / pending per organization ----------
create or replace function public.k1_admin_digest() returns int language plpgsql security definer set search_path = '' as $$
declare o record; n int := 0; lines text[]; c int; body text;
begin
  for o in select id, name, name_hi, parent_id from core.organizations where status = 'active' loop
    lines := '{}';
    select count(*) into c from public.org_memberships m where m.organization_id = o.id and m.status = 'applied';
    if c > 0 then lines := lines || ('👤 सदस्यता मंज़ूरी बाकी: ' || c); end if;
    select count(*) into c from public.letters l where l.organization_id = o.id and l.status = 'pending_approval';
    if c > 0 then lines := lines || ('🪔 शोक संदेश मंज़ूरी बाकी: ' || c); end if;
    select count(*) into c from public.contact_messages cm where cm.organization_id = o.id and cm.status = 'NEW';
    if c > 0 then lines := lines || ('📩 नए संपर्क संदेश: ' || c); end if;
    select count(*) into c from public.gov_tasks t where t.organization_id = o.id and t.status not in ('done', 'cancelled') and t.due_date is not null and t.due_date <= current_date + 2;
    if c > 0 then lines := lines || ('📝 काम जिनकी तिथि 2 दिन में: ' || c); end if;
    select count(*) into c from public.cm_posts p where p.organization_id = o.id and p.moderation_status = 'flagged' and p.status = 'active';
    if c > 0 then lines := lines || ('🛡️ समुदाय में जाँच बाकी पोस्ट: ' || c); end if;
    if o.parent_id is null then
      select count(*) into c from core.organizations x where x.status = 'pending';
      if c > 0 then lines := lines || ('🏛️ संगठन पंजीकरण मंज़ूरी बाकी: ' || c); end if;
    end if;
    if cardinality(lines) > 0 then
      body := array_to_string(lines, E'\n');
      perform public.k1_admin_notify(o.id, 'org.settings.edit', 'digest', '📋 ' || coalesce(o.name_hi, o.name) || ' — आज का सार', body, '/admin', 'organizations', o.id, true);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function public.k1_admin_digest() from public, anon, authenticated;
select cron.schedule('k1-admin-digest', '0 3,13 * * *', $$select public.k1_admin_digest()$$);
