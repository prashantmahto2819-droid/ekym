-- सदस्यता निलंबन (सस्पेंड): एडमिन किसी सदस्य की सदस्यता रोक सकता है (दंड / कोई भी कारण)।
-- नाम वंश वृक्ष, ग्रामवार सूची वगैरह में दिखता रहता है, पर उसे कोई शोकपत्र / सूचना / निमंत्रण (WhatsApp या ईमेल) नहीं जाता,
-- और दूसरों का पत्र भी उसके नंबर से होकर नहीं भेजा जाता (अगला बड़ा पुत्र / मुखिया / परिवार का नंबर लिया जाता है)।
-- कारण व इतिहास अलग निजी तालिका में (सिर्फ़ प्रबंधक एडमिन देखें)।

alter table public.members
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_until date;

create table if not exists public.member_suspensions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  action text not null check (action in ('suspend', 'resume')),
  reason text,
  until date,
  by_user uuid default auth.uid(),
  by_name text,
  created_at timestamptz not null default now()
);
create index if not exists member_suspensions_member on public.member_suspensions(member_id, created_at desc);
alter table public.member_suspensions enable row level security;
revoke all on public.member_suspensions from anon, authenticated;

-- अभी निलंबित? (अवधि बीत जाए तो अपने-आप खत्म)
create or replace function public.shok_member_suspended(p_member uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select m.suspended_at is not null and (m.suspended_until is null or m.suspended_until >= current_date)
                     from public.members m where m.id = p_member), false);
$$;
grant execute on function public.shok_member_suspended(uuid) to authenticated;

-- यह नंबर किसी निलंबित सदस्य का है?
create or replace function public.shok_phone_suspended(p_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(p_phone, '') <> '' and exists (
    select 1 from public.members m
     where (m.phone = p_phone or m.phone2 = p_phone)
       and m.suspended_at is not null and (m.suspended_until is null or m.suspended_until >= current_date));
$$;
grant execute on function public.shok_phone_suspended(text) to authenticated;

-- निलंबन के कॉलम सिर्फ़ प्रबंधक एडमिन (RPC से) बदल सकते हैं
create or replace function public.trg_member_suspension_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('shokpatra.suspend_ok', true) = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.suspended_at := null; new.suspended_until := null; return new;
  end if;
  if new.suspended_at is distinct from old.suspended_at or new.suspended_until is distinct from old.suspended_until then
    new.suspended_at := old.suspended_at; new.suspended_until := old.suspended_until;
  end if;
  return new;
end $$;
drop trigger if exists trg_member_suspension_guard on public.members;
create trigger trg_member_suspension_guard before insert or update on public.members
  for each row execute function public.trg_member_suspension_guard();

-- निलंबित करें
create or replace function public.shok_member_suspend(p_member uuid, p_reason text, p_until date default null)
returns void language plpgsql security definer set search_path = '' as $$
declare fam uuid; nm text;
begin
  select family_id into fam from public.members where id = p_member;
  if fam is null then raise exception 'सदस्य नहीं मिला'; end if;
  if not public.can_manage_family(fam) then raise exception 'यह सदस्य आपके प्रबंधन में नहीं है'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'कारण लिखिए'; end if;
  if p_until is not null and p_until < current_date then raise exception 'तारीख आज या आगे की चुनिए'; end if;
  select full_name into nm from public.profiles where id = auth.uid();
  perform set_config('shokpatra.suspend_ok', 'on', true);
  update public.members set suspended_at = now(), suspended_until = p_until where id = p_member;
  perform set_config('shokpatra.suspend_ok', 'off', true);
  insert into public.member_suspensions (member_id, action, reason, until, by_name) values (p_member, 'suspend', btrim(p_reason), p_until, nm);
  -- पहले से कतार में पड़े इसके संदेश रोकें
  update public.letter_recipients lr set status = 'failed', error = 'सदस्यता निलंबित'
   where lr.status = 'queued' and (lr.member_id = p_member or lr.via_member_id = p_member
          or lr.phone in (select x from (select m.phone x from public.members m where m.id = p_member union select m.phone2 from public.members m where m.id = p_member) q where coalesce(x, '') <> ''));
end $$;
revoke all on function public.shok_member_suspend(uuid, text, date) from public, anon;
grant execute on function public.shok_member_suspend(uuid, text, date) to authenticated;

-- निलंबन हटाएँ
create or replace function public.shok_member_resume(p_member uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare fam uuid; nm text;
begin
  select family_id into fam from public.members where id = p_member;
  if fam is null then raise exception 'सदस्य नहीं मिला'; end if;
  if not public.can_manage_family(fam) then raise exception 'यह सदस्य आपके प्रबंधन में नहीं है'; end if;
  select full_name into nm from public.profiles where id = auth.uid();
  perform set_config('shokpatra.suspend_ok', 'on', true);
  update public.members set suspended_at = null, suspended_until = null where id = p_member;
  perform set_config('shokpatra.suspend_ok', 'off', true);
  insert into public.member_suspensions (member_id, action, reason, by_name) values (p_member, 'resume', nullif(btrim(p_note), ''), nm);
end $$;
revoke all on function public.shok_member_resume(uuid, text) from public, anon;
grant execute on function public.shok_member_resume(uuid, text) to authenticated;

-- इतिहास (प्रबंधक एडमिन)
create or replace function public.shok_member_suspension_log(p_member uuid)
returns table (action text, reason text, until date, by_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare fam uuid;
begin
  select family_id into fam from public.members where id = p_member;
  if fam is null or not public.can_manage_family(fam) then raise exception 'not allowed'; end if;
  return query select s.action, s.reason, s.until, s.by_name, s.created_at from public.member_suspensions s where s.member_id = p_member order by s.created_at desc limit 50;
end $$;
grant execute on function public.shok_member_suspension_log(uuid) to authenticated;

-- भेजने वाली सूची में धूसर दिखाने के लिए (सिर्फ़ id, कारण नहीं)
create or replace function public.shok_suspended_members()
returns table (member_id uuid) language sql stable security definer set search_path = '' as $$
  select m.id from public.members m
   where public.is_approved() and m.suspended_at is not null and (m.suspended_until is null or m.suspended_until >= current_date);
$$;
grant execute on function public.shok_suspended_members() to authenticated;

-- बड़े पुत्र का नंबर: निलंबित पुत्र का नंबर नहीं (उसके आगे के पुत्र देखे जाते हैं)
create or replace function public.shok_eldest_son_phone(p_member uuid, p_depth integer default 0)
returns table(member_id uuid, phone text, name text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare s record; r record; me uuid := p_member;
begin
  if p_depth > 4 then return; end if;
  if p_depth = 0 then
    select coalesce(case when x.member_kind = 'spouse' then x.parent_id end, x.id) into me from public.members x where x.id = p_member;
    me := coalesce(me, p_member);
  end if;
  for s in select m.id, m.phone, m.name from public.members m
            where m.parent_id = me and coalesce(m.member_kind, 'son') = 'son' and not m.is_deceased and not m.name_unknown
            order by m.sort_order, m.created_at loop
    if coalesce(s.phone, '') <> '' and coalesce((select x.whatsapp_ok from public.members x where x.id = s.id), true)
       and not public.shok_member_suspended(s.id) and not public.shok_phone_suspended(s.phone) then
      member_id := s.id; phone := s.phone; name := s.name; return next; return;
    end if;
    for r in select * from public.shok_eldest_son_phone(s.id, p_depth + 1) loop
      member_id := r.member_id; phone := r.phone; name := r.name; return next; return;
    end loop;
  end loop;
  return;
end $function$;

-- पत्र किस नंबर पर: निलंबित सदस्य को कुछ नहीं; किसी निलंबित का नंबर रास्ते में भी नहीं
create or replace function public.shok_deliver_phone(p_member uuid, p_mode text)
returns table(phone text, via_member_id uuid, via_name text)
language plpgsql stable security definer set search_path to 'public' as $function$
declare m public.members; f public.families; head public.members; r record; head_ok boolean;
begin
  select * into m from public.members where id = p_member;
  if m.id is null or public.shok_member_suspended(m.id) then return; end if;
  select * into f from public.families where id = m.family_id;
  select * into head from public.members where id = public.shok_branch_head(p_member);
  head_ok := head.id is not null and not public.shok_member_suspended(head.id);
  if p_mode = 'each_member' then
    if coalesce(m.phone, '') <> '' and coalesce(m.whatsapp_ok, true) and not public.shok_phone_suspended(m.phone) then phone := m.phone; via_member_id := null; via_name := null; return next; return; end if;
    if coalesce(m.phone2, '') <> '' and m.phone2 is distinct from m.phone and not public.shok_phone_suspended(m.phone2) then phone := m.phone2; via_member_id := null; via_name := 'दूसरा नंबर'; return next; return; end if;
    for r in select * from public.shok_eldest_son_phone(m.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  if head_ok and head.id <> m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) and not public.shok_phone_suspended(head.phone) then
    phone := head.phone; via_member_id := head.id; via_name := head.name; return next; return;
  end if;
  if head_ok and head.id = m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) and p_mode <> 'each_member' and not public.shok_phone_suspended(head.phone) then
    phone := head.phone; via_member_id := null; via_name := null; return next; return;
  end if;
  if head_ok and coalesce(head.phone2, '') <> '' and head.phone2 is distinct from head.phone and not public.shok_phone_suspended(head.phone2) then
    phone := head.phone2; via_member_id := head.id; via_name := head.name || ' (दूसरा नंबर)'; return next; return;
  end if;
  if head.id is not null then
    for r in select * from public.shok_eldest_son_phone(head.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  if coalesce(f.main_whatsapp, '') <> '' and coalesce(f.main_whatsapp_ok, true) and not public.shok_phone_suspended(f.main_whatsapp) then phone := f.main_whatsapp; via_member_id := null; via_name := 'परिवार का मुख्य नंबर'; return next; return; end if;
  if coalesce(m.phone, '') <> '' and not public.shok_phone_suspended(m.phone) then phone := m.phone; via_member_id := null; via_name := null; return next; return;
  end if;
  return;
end $function$;

-- सुरक्षा जाल: कोई भी रास्ता हो, निलंबित सदस्य / उसका नंबर कतार में न जाए
create or replace function public.trg_letter_recipient_not_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.member_id is not null and public.shok_member_suspended(new.member_id))
     or (new.via_member_id is not null and public.shok_member_suspended(new.via_member_id))
     or public.shok_phone_suspended(new.phone) then
    if tg_op = 'INSERT' then return null; end if;
    if new.status in ('queued', 'sending') then new.status := 'failed'; new.error := 'सदस्यता निलंबित'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_letter_recipient_not_suspended on public.letter_recipients;
create trigger trg_letter_recipient_not_suspended before insert or update of phone, status on public.letter_recipients
  for each row execute function public.trg_letter_recipient_not_suspended();

-- ईमेल सूचना: जिस ऐप-खाते का नंबर किसी निलंबित सदस्य का है, उसे भी नहीं
create or replace function public.trg_letter_email_not_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.profile_id is not null and public.shok_phone_suspended((select p.phone from public.profiles p where p.id = new.profile_id)) then
    return null;
  end if;
  return new;
end $$;
drop trigger if exists trg_letter_email_not_suspended on public.letter_emails;
create trigger trg_letter_email_not_suspended before insert on public.letter_emails
  for each row execute function public.trg_letter_email_not_suspended();

-- सूचना (परिवार-वार): मुखिया निलंबित हो तो परिवार का अगला सदस्य चुना जाए
do $x$
declare src text;
begin
  select pg_get_functiondef('public.shok_notice_recipients(uuid, uuid[], text)'::regprocedure) into src;
  if position('shok_member_suspended' in src) = 0 then
    src := replace(src,
      'where m.family_id = f.id and not m.is_deceased and not m.name_unknown',
      'where m.family_id = f.id and not m.is_deceased and not m.name_unknown and not public.shok_member_suspended(m.id)');
    execute src;
  end if;
end $x$;
