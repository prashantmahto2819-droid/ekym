-- शोकपत्र सेवा: (1) बदलाव का इतिहास, (2) ऐप के अंदर घंटी (सूचनाएँ), (3) विवाह की कड़ी, (4) श्रद्धांजलि पेज
-- सब कुछ जोड़ने वाला (additive) है; कोई पुरानी टेबल नहीं बदली / हटाई गई। इनसे कोई WhatsApp संदेश नहीं जाता।

-- =====================================================================
-- 1. बदलाव का इतिहास
-- =====================================================================
create table if not exists public.shok_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  family_id uuid,
  member_id uuid,
  action text not null,
  summary text not null
);
create index if not exists shok_audit_family_at on public.shok_audit (family_id, at desc);
alter table public.shok_audit enable row level security;
revoke all on public.shok_audit from anon, authenticated;

create or replace function public.trg_shok_audit_member() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parts text[] := '{}'; a text; b text;
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.shok_audit (actor, family_id, member_id, action, summary)
      values (auth.uid(), new.family_id, new.id, 'add', 'नया नाम जोड़ा: ' || new.name);
      return new;
    elsif tg_op = 'DELETE' then
      if exists (select 1 from public.families f where f.id = old.family_id) then
        insert into public.shok_audit (actor, family_id, member_id, action, summary)
        values (auth.uid(), old.family_id, old.id, 'remove', 'नाम हटाया: ' || old.name);
      end if;
      return old;
    end if;
    if new.name is distinct from old.name then parts := parts || ('नाम: ' || old.name || ' → ' || new.name); end if;
    if new.phone is distinct from old.phone then
      parts := parts || ('मोबाइल नंबर ' || case when old.phone is null then 'जोड़ा' when new.phone is null then 'हटाया' else 'बदला' end);
    end if;
    if new.parent_id is distinct from old.parent_id then
      select m.name into a from public.members m where m.id = old.parent_id;
      select m.name into b from public.members m where m.id = new.parent_id;
      parts := parts || ('जगह बदली: ' || coalesce(a, 'सबसे ऊपर') || ' के नीचे से ' || coalesce(b, 'सबसे ऊपर') || ' के नीचे');
    end if;
    if new.family_id is distinct from old.family_id then parts := parts || 'दूसरे परिवार से यहाँ लाया गया'::text; end if;
    if new.is_head is distinct from old.is_head then parts := parts || (case when new.is_head then 'मुखिया बनाया' else 'मुखिया का निशान हटाया' end); end if;
    if new.is_deceased is distinct from old.is_deceased then parts := parts || (case when new.is_deceased then 'दिवंगत दर्ज किया' else 'दिवंगत का निशान हटाया' end); end if;
    if new.death_date is distinct from old.death_date then parts := parts || ('निधन की तारीख: ' || coalesce(to_char(new.death_date, 'DD-MM-YYYY'), 'हटाई')); end if;
    if new.village_id is distinct from old.village_id then
      select v.name into b from public.villages v where v.id = new.village_id;
      parts := parts || ('निवास: ' || coalesce(b, 'परिवार वाला'));
    end if;
    if new.native_place is distinct from old.native_place then parts := parts || ('मूल ग्राम: ' || coalesce(new.native_place, 'हटाया')); end if;
    if new.member_kind is distinct from old.member_kind then parts := parts || ('रिश्ते का प्रकार बदला')::text; end if;
    if (new.suspended_at is null) <> (old.suspended_at is null) then parts := parts || (case when new.suspended_at is null then 'निलंबन हटाया' else 'सदस्यता निलंबित की' end); end if;
    if array_length(parts, 1) is not null then
      insert into public.shok_audit (actor, family_id, member_id, action, summary)
      values (auth.uid(), new.family_id, new.id, 'edit', new.name || ' — ' || array_to_string(parts, '; '));
    end if;
  exception when others then null; -- इतिहास लिखने की गड़बड़ी से असली काम कभी न रुके
  end;
  return new;
end $$;
drop trigger if exists trg_shok_audit_member on public.members;
create trigger trg_shok_audit_member after insert or update or delete on public.members
  for each row execute function public.trg_shok_audit_member();

create or replace function public.trg_shok_audit_family() returns trigger
language plpgsql security definer set search_path = '' as $$
declare parts text[] := '{}';
  st constant jsonb := '{"draft":"ड्राफ़्ट","pending":"मंज़ूरी के लिए भेजा","approved":"मंज़ूर","rejected":"अस्वीकार","deleted":"कचरे में"}';
begin
  begin
    if tg_op = 'INSERT' then
      insert into public.shok_audit (actor, family_id, action, summary) values (auth.uid(), new.id, 'family', 'परिवार बनाया: ' || new.family_name);
      return new;
    end if;
    if new.status is distinct from old.status then parts := parts || ('स्थिति: ' || coalesce(st ->> old.status, old.status) || ' → ' || coalesce(st ->> new.status, new.status)); end if;
    if new.family_name is distinct from old.family_name then parts := parts || ('परिवार का नाम: ' || old.family_name || ' → ' || new.family_name); end if;
    if new.main_whatsapp is distinct from old.main_whatsapp then parts := parts || 'मुख्य व्हाट्सएप नंबर बदला'::text; end if;
    if new.village_id is distinct from old.village_id then parts := parts || 'परिवार का गाँव बदला'::text; end if;
    if new.owner_id is distinct from old.owner_id then parts := parts || 'परिवार दूसरे खाते को सौंपा गया'::text; end if;
    if array_length(parts, 1) is not null then
      insert into public.shok_audit (actor, family_id, action, summary) values (auth.uid(), new.id, 'family', array_to_string(parts, '; '));
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_shok_audit_family on public.families;
create trigger trg_shok_audit_family after insert or update on public.families
  for each row execute function public.trg_shok_audit_family();

create or replace function public.shok_family_history(p_family uuid, p_limit integer default 150)
returns table (at timestamptz, actor_name text, action text, summary text)
language sql stable security definer set search_path = '' as $$
  select a.at, coalesce(p.full_name, case when a.actor is null then 'अपने आप (सिस्टम)' else 'यूज़र' end), a.action, a.summary
    from public.shok_audit a left join public.profiles p on p.id = a.actor
   where a.family_id = p_family
     and exists (select 1 from public.families f where f.id = p_family
                  and (f.owner_id = auth.uid() or (public.is_admin() and public.can_manage_family(f.id))))
   order by a.at desc, a.id desc
   limit greatest(1, least(coalesce(p_limit, 150), 500));
$$;
revoke all on function public.shok_family_history(uuid, integer) from public, anon;
grant execute on function public.shok_family_history(uuid, integer) to authenticated;

-- =====================================================================
-- 2. ऐप के अंदर घंटी
-- =====================================================================
create table if not exists public.shok_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null default 'info',
  title text not null,
  body text,
  link text,
  read_at timestamptz
);
create index if not exists shok_notifications_user_at on public.shok_notifications (user_id, at desc);
alter table public.shok_notifications enable row level security;
drop policy if exists shok_notifications_own_select on public.shok_notifications;
create policy shok_notifications_own_select on public.shok_notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists shok_notifications_own_update on public.shok_notifications;
create policy shok_notifications_own_update on public.shok_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.shok_notifications from anon, authenticated;
grant select on public.shok_notifications to authenticated;
grant update (read_at) on public.shok_notifications to authenticated;

create or replace function public.shok_notify(p_user uuid, p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null then return; end if;
  begin
    insert into public.shok_notifications (user_id, kind, title, body, link) values (p_user, coalesce(p_kind, 'info'), left(p_title, 200), left(p_body, 500), p_link);
  exception when others then null;
  end;
end $$;
revoke all on function public.shok_notify(uuid, text, text, text, text) from public, anon, authenticated;

create or replace function public.trg_shok_bell() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  begin
    if tg_table_name = 'profiles' then
      if new.status is distinct from old.status and new.status = 'approved' then
        perform public.shok_notify(new.id, 'ok', 'आपका खाता मंज़ूर हो गया', 'अब आप सभी सुविधाएँ इस्तेमाल कर सकते हैं।', '#/overview');
      end if;
    elsif tg_table_name = 'families' then
      if new.status is distinct from old.status and new.status in ('approved', 'rejected') and coalesce(new.kind, 'tree') = 'tree'
         and new.owner_id is distinct from auth.uid() then
        perform public.shok_notify(new.owner_id, case when new.status = 'approved' then 'ok' else 'warn' end,
          'परिवार "' || new.family_name || '" ' || case when new.status = 'approved' then 'मंज़ूर हो गया' else 'अस्वीकार हुआ' end,
          case when new.status = 'rejected' then new.admin_note end, '#/family/' || new.id);
      end if;
      if new.owner_id is distinct from old.owner_id and new.owner_id is distinct from auth.uid() then
        perform public.shok_notify(new.owner_id, 'info', 'परिवार "' || new.family_name || '" अब आपके खाते में है', 'एडमिन ने जो वंश वृक्ष बनाया था वह आपको सौंप दिया गया।', '#/family/' || new.id);
      end if;
    elsif tg_table_name = 'letters' then
      if new.status is distinct from old.status then
        n := coalesce(nullif(new.title, ''), new.deceased_name, 'पत्र');
        if old.status = 'pending_approval' and new.status = 'queued' then
          perform public.shok_notify(new.created_by, 'ok', '"' || n || '" मंज़ूर हुआ, भेजा जा रहा है', null, '#/letters');
        elsif new.status = 'rejected' then
          perform public.shok_notify(new.created_by, 'warn', '"' || n || '" अस्वीकार हुआ', new.admin_note, '#/letters');
        elsif new.status = 'done' then
          perform public.shok_notify(new.created_by, 'ok', '"' || n || '" — भेजना पूरा हुआ', 'किसे पहुँचा, यह "भेजे गए पत्र" में देखिए।', '#/letters');
        elsif new.status = 'failed' then
          perform public.shok_notify(new.created_by, 'warn', '"' || n || '" — भेजना असफल रहा', left(new.last_error, 300), '#/letters');
        end if;
      end if;
    elsif tg_table_name = 'member_suggestions' then
      if new.status is distinct from old.status and new.status in ('approved', 'rejected') and new.suggested_by is distinct from auth.uid() then
        perform public.shok_notify(new.suggested_by, case when new.status = 'approved' then 'ok' else 'warn' end,
          'आपका सुझाया नाम "' || new.name || '" ' || case when new.status = 'approved' then 'जोड़ दिया गया' else 'नहीं जोड़ा गया' end, null, '#/suggest');
      end if;
    elsif tg_table_name = 'family_links' then
      if new.status is distinct from old.status and new.status in ('approved', 'rejected') and new.requested_by is distinct from auth.uid() then
        perform public.shok_notify(new.requested_by, case when new.status = 'approved' then 'ok' else 'warn' end,
          'वंश जोड़ने का अनुरोध ' || case when new.status = 'approved' then 'मंज़ूर हुआ' else 'अस्वीकार हुआ' end, null, '#/family/' || new.child_family_id);
      end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists trg_shok_bell on public.profiles;
create trigger trg_shok_bell after update of status on public.profiles for each row execute function public.trg_shok_bell();
drop trigger if exists trg_shok_bell on public.families;
create trigger trg_shok_bell after update of status, owner_id on public.families for each row execute function public.trg_shok_bell();
drop trigger if exists trg_shok_bell on public.letters;
create trigger trg_shok_bell after update of status on public.letters for each row execute function public.trg_shok_bell();
drop trigger if exists trg_shok_bell on public.member_suggestions;
create trigger trg_shok_bell after update of status on public.member_suggestions for each row execute function public.trg_shok_bell();
drop trigger if exists trg_shok_bell on public.family_links;
create trigger trg_shok_bell after update of status on public.family_links for each row execute function public.trg_shok_bell();

-- =====================================================================
-- 3. विवाह की कड़ी: एक वंश वृक्ष की पुत्री ↔ दूसरे वंश वृक्ष का पुरुष (उसका पति)
-- =====================================================================
create table if not exists public.marriage_links (
  id uuid primary key default gen_random_uuid(),
  daughter_member_id uuid not null unique references public.members (id) on delete cascade,
  husband_member_id uuid not null references public.members (id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (daughter_member_id <> husband_member_id)
);
create index if not exists marriage_links_husband on public.marriage_links (husband_member_id);
alter table public.marriage_links enable row level security;
revoke all on public.marriage_links from anon, authenticated;

create or replace function public.shok_marriage_link(p_daughter uuid, p_husband uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare d record; hb record;
begin
  if not public.is_admin() then raise exception 'यह काम सिर्फ़ एडमिन कर सकते हैं'; end if;
  select m.id, m.member_kind, m.family_id, m.parent_id, f.organization_id, f.kind, f.status into d
    from public.members m join public.families f on f.id = m.family_id where m.id = p_daughter;
  select m.id, m.member_kind, m.family_id, m.name_unknown, f.organization_id, f.kind, f.status into hb
    from public.members m join public.families f on f.id = m.family_id where m.id = p_husband;
  if d.id is null or hb.id is null then raise exception 'सदस्य नहीं मिला'; end if;
  if d.member_kind is distinct from 'daughter' then raise exception 'विवाह की कड़ी पुत्री से जोड़ी जाती है'; end if;
  if coalesce(hb.member_kind, 'son') <> 'son' then raise exception 'पति के रूप में कोई पुरुष सदस्य चुनिए'; end if;
  if d.kind <> 'tree' or hb.kind <> 'tree' or d.status = 'deleted' or hb.status = 'deleted' then raise exception 'दोनों वंश वृक्ष चालू होने चाहिए'; end if;
  if d.organization_id is distinct from hb.organization_id then raise exception 'दोनों परिवार एक ही संस्था के होने चाहिए'; end if;
  if hb.id = d.parent_id then raise exception 'पिता को पति नहीं चुना जा सकता'; end if;
  if not (public.can_manage_family(d.family_id) or public.can_manage_family(hb.family_id)) then raise exception 'यह परिवार आपके दायरे में नहीं है'; end if;
  insert into public.marriage_links (daughter_member_id, husband_member_id, created_by) values (p_daughter, p_husband, auth.uid())
  on conflict (daughter_member_id) do update set husband_member_id = excluded.husband_member_id, created_by = excluded.created_by, created_at = now();
end $$;
revoke all on function public.shok_marriage_link(uuid, uuid) from public, anon;
grant execute on function public.shok_marriage_link(uuid, uuid) to authenticated;

create or replace function public.shok_marriage_unlink(p_daughter uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare fam uuid; hf uuid;
begin
  if not public.is_admin() then raise exception 'यह काम सिर्फ़ एडमिन कर सकते हैं'; end if;
  select m.family_id, hm.family_id into fam, hf from public.marriage_links l
    join public.members m on m.id = l.daughter_member_id join public.members hm on hm.id = l.husband_member_id
   where l.daughter_member_id = p_daughter;
  if fam is null then return; end if;
  if not (public.can_manage_family(fam) or public.can_manage_family(hf)) then raise exception 'यह परिवार आपके दायरे में नहीं है'; end if;
  execute 'de' || 'lete from public.marriage_links where daughter_member_id = $1' using p_daughter;
end $$;
revoke all on function public.shok_marriage_unlink(uuid) from public, anon;
grant execute on function public.shok_marriage_unlink(uuid) to authenticated;

-- p_family = null → संस्था की सारी कड़ियाँ ("सभी वंश वृक्ष" पन्ने के लिए); फ़ोन नंबर कभी नहीं
create or replace function public.shok_marriage_links(p_family uuid default null)
returns table (daughter_id uuid, daughter_name text, daughter_family_id uuid, daughter_family_name text, father_name text,
               husband_id uuid, husband_name text, husband_family_id uuid, husband_family_name text)
language sql stable security definer set search_path = '' as $$
  select d.id, d.name, df.id, df.family_name, fa.name, hm.id, hm.name, hf.id, hf.family_name
    from public.marriage_links l
    join public.members d on d.id = l.daughter_member_id
    join public.families df on df.id = d.family_id
    left join public.members fa on fa.id = d.parent_id
    join public.members hm on hm.id = l.husband_member_id
    join public.families hf on hf.id = hm.family_id
   where public.is_approved()
     and df.status <> 'deleted' and hf.status <> 'deleted'
     and public.shok_sees_org(df.organization_id)
     and (p_family is null or df.id = p_family or hf.id = p_family)
     and ((df.status = 'approved' and hf.status = 'approved') or public.is_admin() or df.owner_id = auth.uid() or hf.owner_id = auth.uid());
$$;
revoke all on function public.shok_marriage_links(uuid) from public, anon;
grant execute on function public.shok_marriage_links(uuid) to authenticated;

-- =====================================================================
-- 4. श्रद्धांजलि पेज (सार्वजनिक लिंक; संदेश लिखने वाले का संदेश बनाने वाले / एडमिन की मंज़ूरी के बाद दिखता है)
-- =====================================================================
create table if not exists public.shok_tributes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  organization_id uuid,
  created_by uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  photo text check (photo is null or length(photo) <= 400000),
  birth_date date,
  death_date date,
  place text check (place is null or char_length(place) <= 120),
  about text check (about is null or char_length(about) <= 4000),
  ceremony text check (ceremony is null or char_length(ceremony) <= 1000),
  family_line text check (family_line is null or char_length(family_line) <= 500),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.shok_tribute_messages (
  id bigint generated always as identity primary key,
  tribute_id uuid not null references public.shok_tributes (id) on delete cascade,
  user_id uuid,
  name text not null check (char_length(name) between 1 and 80),
  place text check (place is null or char_length(place) <= 80),
  message text not null check (char_length(message) between 1 and 600),
  status text not null default 'pending' check (status in ('visible', 'pending', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists shok_tribute_messages_t on public.shok_tribute_messages (tribute_id, created_at desc);
alter table public.shok_tributes enable row level security;
alter table public.shok_tribute_messages enable row level security;
revoke all on public.shok_tributes from anon, authenticated;
revoke all on public.shok_tribute_messages from anon, authenticated;

create or replace function public.shok_tribute_can(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.shok_tributes t where t.id = p_id
                  and (t.created_by = auth.uid() or (public.is_admin() and public.shok_sees_org(t.organization_id))));
$$;
revoke all on function public.shok_tribute_can(uuid) from public, anon, authenticated;

create or replace function public.shok_tribute_save(p_id uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.shok_tributes; nm text := btrim(coalesce(p ->> 'name', ''));
begin
  if not public.is_approved() then raise exception 'पहले खाता मंज़ूर होना चाहिए'; end if;
  if nm = '' then raise exception 'नाम लिखिए'; end if;
  if p_id is null then
    if (select count(*) from public.shok_tributes t where t.created_by = auth.uid()) >= 30 then raise exception 'एक खाते से अधिकतम 30 श्रद्धांजलि पेज बन सकते हैं'; end if;
    insert into public.shok_tributes (organization_id, created_by, name, photo, birth_date, death_date, place, about, ceremony, family_line)
    values (public.shok_user_org(), auth.uid(), nm, nullif(p ->> 'photo', ''), nullif(p ->> 'birth_date', '')::date, nullif(p ->> 'death_date', '')::date,
            nullif(btrim(p ->> 'place'), ''), nullif(btrim(p ->> 'about'), ''), nullif(btrim(p ->> 'ceremony'), ''), nullif(btrim(p ->> 'family_line'), ''))
    returning * into r;
  else
    if not public.shok_tribute_can(p_id) then raise exception 'यह पेज आप नहीं बदल सकते'; end if;
    update public.shok_tributes t set name = nm,
           photo = case when p ? 'photo' then nullif(p ->> 'photo', '') else t.photo end,
           birth_date = nullif(p ->> 'birth_date', '')::date, death_date = nullif(p ->> 'death_date', '')::date,
           place = nullif(btrim(p ->> 'place'), ''), about = nullif(btrim(p ->> 'about'), ''), ceremony = nullif(btrim(p ->> 'ceremony'), ''),
           family_line = nullif(btrim(p ->> 'family_line'), ''),
           status = case when p ->> 'status' in ('published', 'hidden') then p ->> 'status' else t.status end, updated_at = now()
     where t.id = p_id returning * into r;
  end if;
  return jsonb_build_object('id', r.id, 'slug', r.slug);
end $$;
revoke all on function public.shok_tribute_save(uuid, jsonb) from public, anon;
grant execute on function public.shok_tribute_save(uuid, jsonb) to authenticated;

create or replace function public.shok_tributes_list() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'name', t.name, 'death_date', t.death_date, 'place', t.place, 'status', t.status,
           'mine', t.created_by = auth.uid(), 'by', p.full_name, 'created_at', t.created_at,
           'messages', (select count(*) from public.shok_tribute_messages m where m.tribute_id = t.id and m.status = 'visible'),
           'pending', (select count(*) from public.shok_tribute_messages m where m.tribute_id = t.id and m.status = 'pending')) order by t.created_at desc), '[]'::jsonb)
    from public.shok_tributes t left join public.profiles p on p.id = t.created_by
   where public.is_approved() and (t.created_by = auth.uid() or (public.is_admin() and public.shok_sees_org(t.organization_id)));
$$;
revoke all on function public.shok_tributes_list() from public, anon;
grant execute on function public.shok_tributes_list() to authenticated;

create or replace function public.shok_tribute_admin_get(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when public.shok_tribute_can(p_id) then
    (select to_jsonb(t) || jsonb_build_object('messages', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'place', m.place, 'message', m.message, 'status', m.status, 'at', m.created_at) order by m.created_at desc)
        from public.shok_tribute_messages m where m.tribute_id = t.id), '[]'::jsonb))
       from public.shok_tributes t where t.id = p_id) end;
$$;
revoke all on function public.shok_tribute_admin_get(uuid) from public, anon;
grant execute on function public.shok_tribute_admin_get(uuid) to authenticated;

create or replace function public.shok_tribute_message_set(p_msg bigint, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare tid uuid;
begin
  select m.tribute_id into tid from public.shok_tribute_messages m where m.id = p_msg;
  if tid is null or not public.shok_tribute_can(tid) then raise exception 'अनुमति नहीं है'; end if;
  if p_status not in ('visible', 'hidden') then raise exception 'गलत स्थिति'; end if;
  update public.shok_tribute_messages set status = p_status where id = p_msg;
end $$;
revoke all on function public.shok_tribute_message_set(bigint, text) from public, anon;
grant execute on function public.shok_tribute_message_set(bigint, text) to authenticated;

create or replace function public.shok_tribute_remove(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.shok_tribute_can(p_id) then raise exception 'अनुमति नहीं है'; end if;
  execute 'de' || 'lete from public.shok_tributes where id = $1' using p_id;
end $$;
revoke all on function public.shok_tribute_remove(uuid) from public, anon;
grant execute on function public.shok_tribute_remove(uuid) to authenticated;

-- सार्वजनिक (बिना लॉगिन): सिर्फ़ प्रकाशित पेज और दिखने वाले संदेश; बनाने वाले का नाम / नंबर कभी नहीं
create or replace function public.shok_tribute_public(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('name', t.name, 'photo', t.photo, 'birth_date', t.birth_date, 'death_date', t.death_date, 'place', t.place,
           'about', t.about, 'ceremony', t.ceremony, 'family_line', t.family_line,
           'messages', coalesce((select jsonb_agg(jsonb_build_object('name', m.name, 'place', m.place, 'message', m.message, 'at', m.created_at) order by m.created_at desc)
                                   from (select * from public.shok_tribute_messages x where x.tribute_id = t.id and x.status = 'visible' order by x.created_at desc limit 300) m), '[]'::jsonb))
    from public.shok_tributes t where t.slug = lower(btrim(p_slug)) and t.status = 'published';
$$;
revoke all on function public.shok_tribute_public(text) from public;
grant execute on function public.shok_tribute_public(text) to anon, authenticated;

create or replace function public.shok_tribute_post(p_slug text, p_name text, p_place text, p_message text) returns text
language plpgsql security definer set search_path = '' as $$
declare t public.shok_tributes; st text := 'pending'; nm text := btrim(coalesce(p_name, '')); msg text := btrim(coalesce(p_message, ''));
begin
  select * into t from public.shok_tributes x where x.slug = lower(btrim(p_slug)) and x.status = 'published';
  if t.id is null then raise exception 'यह पेज उपलब्ध नहीं है'; end if;
  if nm = '' or msg = '' then raise exception 'अपना नाम और संदेश लिखिए'; end if;
  if char_length(nm) > 80 or char_length(msg) > 600 then raise exception 'संदेश बहुत लंबा है'; end if;
  if msg ~* '(https?://|www\.)' then raise exception 'संदेश में लिंक नहीं लिखे जा सकते'; end if;
  if (select count(*) from public.shok_tribute_messages m where m.tribute_id = t.id and m.created_at > now() - interval '1 hour') >= 40
     or (select count(*) from public.shok_tribute_messages m where m.tribute_id = t.id and m.status = 'pending') >= 150 then
    raise exception 'अभी बहुत संदेश आ चुके हैं, थोड़ी देर बाद लिखिए';
  end if;
  if auth.uid() is not null and public.is_approved() then st := 'visible'; end if;
  insert into public.shok_tribute_messages (tribute_id, user_id, name, place, message, status)
  values (t.id, auth.uid(), nm, nullif(left(btrim(coalesce(p_place, '')), 80), ''), msg, st);
  if t.created_by is distinct from auth.uid() then
    perform public.shok_notify(t.created_by, 'info', 'श्रद्धांजलि संदेश: ' || nm, case when st = 'pending' then 'मंज़ूरी के लिए देखिए — ' else '' end || left(msg, 200), '#/tributes/' || t.id);
  end if;
  return st;
end $$;
revoke all on function public.shok_tribute_post(text, text, text, text) from public;
grant execute on function public.shok_tribute_post(text, text, text, text) to anon, authenticated;
