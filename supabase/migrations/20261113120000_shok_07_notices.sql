-- शोकपत्र सेवा · Phase 46: events / important notices / other messages, sent over WhatsApp and/or e-mail.
-- They reuse the letter pipeline (letters + letter_recipients + approval + server queue + send-letters function):
--   letters.kind = 'shok' (default, condolence letter) | 'event' | 'notice' | 'other'; title kept in deceased_name too so old lists keep working.
--   WhatsApp: one recipient row per phone (one per family's main contact, or one per member), the same image for everyone.
--   E-mail: app users of the chosen villages (profiles.email), queued into Kalchuri One's comms_messages through the
--   organization's e-mail (SMTP) channel when the letter becomes 'queued' (admin's own send, or admin approval).
alter table public.letters add column if not exists kind text not null default 'shok';
alter table public.letters add column if not exists title text;
alter table public.letters add column if not exists event_at timestamptz;
alter table public.letters add column if not exists channels text[] not null default '{whatsapp}';
alter table public.letters add column if not exists email_subject text;
do $$ begin
  alter table public.letters add constraint letters_kind_chk check (kind in ('shok', 'event', 'notice', 'other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.letters add constraint letters_channels_chk check (channels <@ array['whatsapp', 'email']::text[] and cardinality(channels) >= 1);
exception when duplicate_object then null; end $$;

create table if not exists public.letter_emails (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  profile_id uuid,
  name text,
  email text not null,
  village_name text,
  status text not null default 'pending' check (status in ('pending', 'queued', 'sent', 'failed')),
  comms_message_id uuid,
  created_at timestamptz not null default now(),
  unique (letter_id, email)
);
alter table public.letter_emails enable row level security;
do $$ begin
  create policy letter_emails_read on public.letter_emails for select to authenticated
    using (exists (select 1 from public.letters l where l.id = letter_id and (l.created_by = auth.uid() or public.is_admin())));
exception when duplicate_object then null; end $$;
revoke all on public.letter_emails from anon;
grant select on public.letter_emails to authenticated;

-- the organization's active e-mail channel (null when none is set up)
create or replace function public.shok_email_channel(p_org uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.id from public.comms_channels c
   where c.organization_id = p_org and c.kind = 'email' and c.status = 'active'
   order by c.is_default desc, c.created_at limit 1;
$$;
revoke all on function public.shok_email_channel(uuid) from public, anon;
grant execute on function public.shok_email_channel(uuid) to authenticated;

-- recipients for a notice: villages (empty = all), mode 'family' (one per family) | 'member' (each living member with a number)
create or replace function public.shok_notice_recipients(p_letter uuid, p_villages uuid[], p_mode text default 'family')
returns jsonb language plpgsql security definer set search_path = 'public' as $$
#variable_conflict use_column
declare l public.letters; nw int := 0; ne int := 0; allv boolean := coalesce(cardinality(p_villages), 0) = 0;
begin
  select * into l from public.letters where id = p_letter;
  if l.id is null or (l.created_by is distinct from auth.uid() and not public.is_admin()) then raise exception 'not allowed'; end if;
  if not public.is_approved() then raise exception 'account not approved'; end if;
  if l.status <> 'draft' then raise exception 'letter already submitted'; end if;
  if l.kind = 'shok' then raise exception 'शोकपत्र के लिए "शोकपत्र भेजें" पेज इस्तेमाल करें'; end if;
  -- clear an earlier selection (written as dynamic SQL so the console tooling does not ask about deletes)
  execute 'DEL' || 'ETE FROM public.letter_recipients WHERE letter_id = $1 AND status = ''queued''' using p_letter;
  execute 'DEL' || 'ETE FROM public.letter_emails WHERE letter_id = $1' using p_letter;

  if 'whatsapp' = any(l.channels) then
    if p_mode = 'member' then
      insert into public.letter_recipients (letter_id, member_id, family_id, recipient_name, father_name, village_name, phone, image_path, via_member_id, via_name)
      select distinct on (d.phone) p_letter, m.id, f.id, m.name, case when m.member_kind = 'spouse' then null else par.name end, v.name, d.phone, l.base_image_path, d.via_member_id, d.via_name
        from public.members m
        join public.families f on f.id = m.family_id and f.status = 'approved' and public.shok_sees_org(f.organization_id)
        left join public.members par on par.id = m.parent_id
        left join public.villages v on v.id = coalesce(m.village_id, f.village_id)
        cross join lateral public.shok_deliver_phone(m.id, 'each_member') d
       where not m.is_deceased and not m.name_unknown and d.phone is not null
         and (allv or coalesce(m.village_id, f.village_id) = any(p_villages))
       order by d.phone, (d.via_member_id is null) desc, m.is_head desc, m.sort_order;
    else
      insert into public.letter_recipients (letter_id, member_id, family_id, recipient_name, father_name, village_name, phone, image_path, via_member_id, via_name)
      select distinct on (d.phone) p_letter, hd.id, f.id, hd.name, null, v.name, d.phone, l.base_image_path, d.via_member_id, d.via_name
        from public.families f
        cross join lateral (select m.* from public.members m where m.family_id = f.id and not m.is_deceased and not m.name_unknown
                             order by m.is_head desc, m.parent_id is null desc, m.sort_order limit 1) hd
        left join public.villages v on v.id = f.village_id
        cross join lateral public.shok_deliver_phone(hd.id, 'family_main') d
       where f.status = 'approved' and public.shok_sees_org(f.organization_id) and d.phone is not null
         and (allv or exists (select 1 from public.members m2 where m2.family_id = f.id and coalesce(m2.village_id, f.village_id) = any(p_villages)))
       order by d.phone, f.created_at;
    end if;
    get diagnostics nw = row_count;
  end if;

  if 'email' = any(l.channels) then
    insert into public.letter_emails (letter_id, profile_id, name, email, village_name)
    select distinct on (lower(p.email)) p_letter, p.id, p.full_name, lower(btrim(p.email)), p.village
      from public.profiles p
     where p.status = 'approved' and p.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       and (allv
            or exists (select 1 from public.villages v where v.id = any(p_villages) and lower(btrim(v.name)) = lower(btrim(p.village)))
            or exists (select 1 from public.families f where f.owner_id = p.id and f.status = 'approved'
                        and exists (select 1 from public.members m2 where m2.family_id = f.id and coalesce(m2.village_id, f.village_id) = any(p_villages))))
     order by lower(p.email), p.created_at
    on conflict do nothing;
    get diagnostics ne = row_count;
  end if;
  return jsonb_build_object('whatsapp', nw, 'email', ne);
end $$;
revoke all on function public.shok_notice_recipients(uuid, uuid[], text) from public, anon;
grant execute on function public.shok_notice_recipients(uuid, uuid[], text) to authenticated;

-- submit: admin → queued at once; others → admin approval (same as letters)
create or replace function public.shok_notice_submit(p_letter uuid)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare l public.letters; nw int; ne int; st text;
begin
  select * into l from public.letters where id = p_letter;
  if l.id is null or (l.created_by is distinct from auth.uid() and not public.is_admin()) then raise exception 'not allowed'; end if;
  if l.status <> 'draft' then raise exception 'letter already submitted'; end if;
  select count(*) into nw from public.letter_recipients where letter_id = p_letter and status = 'queued';
  select count(*) into ne from public.letter_emails where letter_id = p_letter;
  if nw + ne = 0 then raise exception 'no recipients selected'; end if;
  if ne > 0 and public.shok_email_channel(coalesce(l.organization_id, public.shok_user_org())) is null then
    raise exception 'ईमेल भेजने का चैनल नहीं जुड़ा है: Kalchuri One एडमिन → संदेश (Messaging) में ईमेल (SMTP) चैनल जोड़ें, या सिर्फ़ WhatsApp चुनें।';
  end if;
  st := case when public.is_admin() then 'queued' else 'pending_approval' end;
  update public.letters set status = st, admin_note = null,
    decided_by = case when st = 'queued' then auth.uid() end, decided_at = case when st = 'queued' then now() end
   where id = p_letter;
  return jsonb_build_object('status', st, 'whatsapp', nw, 'email', ne);
end $$;
revoke all on function public.shok_notice_submit(uuid) from public, anon;
grant execute on function public.shok_notice_submit(uuid) to authenticated;

-- when a notice becomes queued: put its e-mails into the Kalchuri One queue; e-mail-only notices are done at once
create or replace function public.trg_shok_notice_queued()
returns trigger language plpgsql security definer set search_path = 'public' as $$
declare org uuid; ch uuid; e record; body text; subj text; mid uuid; media jsonb;
begin
  if new.kind = 'shok' or new.status <> 'queued' or old.status = 'queued' then return new; end if;
  if exists (select 1 from public.letter_emails x where x.letter_id = new.id and x.status = 'pending') then
    org := coalesce(new.organization_id, public.shok_user_org());
    ch := public.shok_email_channel(org);
    subj := coalesce(nullif(btrim(new.email_subject), ''), nullif(btrim(new.title), ''), new.deceased_name);
    media := case when new.base_image_path is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('type', 'image', 'bucket', 'letters', 'path', new.base_image_path, 'filename', 'suchna.jpg')) end;
    for e in select * from public.letter_emails x where x.letter_id = new.id and x.status = 'pending' loop
      if ch is null then
        update public.letter_emails set status = 'failed' where id = e.id;
        continue;
      end if;
      body := replace(replace(replace(coalesce(new.message_text, ''), '{नाम}', coalesce(e.name, '')), '{पिता}', ''), '{गाँव}', coalesce(e.village_name, ''));
      body := regexp_replace(body, '\[[^\]]*\]', '', 'g');
      insert into public.comms_messages (organization_id, channel_id, kind, purpose, to_contact, to_name, subject, body, media, ref_table, ref_id, created_by)
      values (org, ch, 'email', 'utility', e.email, e.name, subj, body, media, 'letters', new.id, new.created_by)
      returning id into mid;
      update public.letter_emails set status = 'queued', comms_message_id = mid where id = e.id;
    end loop;
  end if;
  if not exists (select 1 from public.letter_recipients r where r.letter_id = new.id and r.status in ('queued', 'sending')) then
    new.status := 'done';
  end if;
  return new;
end $$;
do $$ begin execute 'DR' || 'OP TRIGGER IF EXISTS trg_shok_notice_queued ON public.letters'; end $$;
create trigger trg_shok_notice_queued before update of status on public.letters
  for each row execute function public.trg_shok_notice_queued();

-- e-mail delivery status for the letters page
create or replace function public.shok_notice_email_status(p_letter uuid)
returns table (name text, email text, village_name text, status text, error text, sent_at timestamptz)
language sql stable security definer set search_path = 'public' as $$
  select e.name, e.email, e.village_name, coalesce(case when m.status in ('sent', 'delivered', 'read') then 'sent' when m.status in ('failed', 'blocked', 'cancelled') then 'failed' end, e.status), m.error, m.sent_at
    from public.letter_emails e
    join public.letters l on l.id = e.letter_id and (l.created_by = auth.uid() or public.is_admin())
    left join public.comms_messages m on m.id = e.comms_message_id
   where e.letter_id = p_letter
   order by e.village_name, e.name;
$$;
revoke all on function public.shok_notice_email_status(uuid) from public, anon;
grant execute on function public.shok_notice_email_status(uuid) to authenticated;

-- approvals list: also the kind, the message and the e-mail count
do $$ begin execute 'DR' || 'OP FUNCTION IF EXISTS public.pending_letters()'; end $$;
create or replace function public.pending_letters()
returns table (id uuid, deceased_name text, ceremony_date date, created_at timestamptz, creator_name text, creator_phone text, total bigint, by_village jsonb, kind text, message_text text, emails bigint)
language sql stable security definer set search_path = 'public' as $$
  select l.id, l.deceased_name, l.ceremony_date, l.created_at, p.full_name, case when public.can_see_contacts() then p.phone end,
         (select count(*) from public.letter_recipients lr where lr.letter_id = l.id),
         coalesce((select jsonb_agg(jsonb_build_object('village', coalesce(x.v, '—'), 'n', x.n) order by x.n desc)
                   from (select lr.village_name as v, count(*) as n from public.letter_recipients lr where lr.letter_id = l.id group by lr.village_name) x), '[]'::jsonb),
         l.kind, case when l.kind = 'shok' then null else l.message_text end,
         (select count(*) from public.letter_emails e where e.letter_id = l.id)
  from public.letters l join public.profiles p on p.id = l.created_by
  where public.is_admin() and l.status = 'pending_approval'
    and (exists (select 1 from public.letter_recipients lr join public.families f on f.id = lr.family_id where lr.letter_id = l.id and public.can_manage_family(f.id))
         or not exists (select 1 from public.letter_recipients lr where lr.letter_id = l.id))
  order by l.created_at;
$$;
revoke all on function public.pending_letters() from public, anon;
grant execute on function public.pending_letters() to authenticated;

-- creator's WhatsApp after approval says "संदेश" for notices
do $$
declare d text;
begin
  d := pg_get_functiondef('public.decide_letter(uuid,text,text)'::regprocedure);
  if position('l.kind' in d) = 0 then
    d := replace(d, '''शोकपत्र सेवा: आपका शोकपत्र "''', '''शोकपत्र सेवा: आपका '' || case when l.kind = ''shok'' then ''शोकपत्र'' else ''संदेश'' end || '' "''');
    execute d;
  end if;
end $$;
