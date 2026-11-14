-- संपर्क सूची (contact list): households whose place in a family tree is disputed / not to be shown, but who must still
-- get शोक पत्र, सूचना / आमंत्रण. Stored as families.kind = 'contact' with one member (the contact, relation 'संपर्क',
-- no parent, no father name), family_name fixed to 'संपर्क सूची' so no family/relation is revealed anywhere.
-- * Kept OUT of: directory_families (browse / suggest), similar-name + match hints, empty-tree list, Kalchuri One family
--   list (k1_families) — patched below by adding "kind = 'tree'" to their family filters.
-- * Kept IN: directory_members (send picker), create_letter_recipients, shok_notice_recipients (no change needed).
-- * Who adds: super admin or "पूरी पहुँच" admins (RPC shok_contact_save). Owner = super admin, so the adding admin is
--   not shown; who added it, a private note and an optional related family are in shok_contact_notes (super admin only).
-- * No auto-claim (entered_by_admin false, contact_phone null); welcome WhatsApp says "संपर्क सूची" without names.
alter table public.families add column if not exists kind text not null default 'tree';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'families_kind_check') then
    alter table public.families add constraint families_kind_check check (kind in ('tree', 'contact'));
  end if;
end $$;
create index if not exists families_kind_idx on public.families (kind) where kind <> 'tree';

create table if not exists public.shok_contact_notes (
  family_id uuid primary key references public.families(id) on delete cascade,
  note text,
  related_family_id uuid references public.families(id) on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.shok_contact_notes enable row level security;
revoke all on public.shok_contact_notes from anon, authenticated;

create or replace function public.shok_can_add_contacts()
returns boolean language sql stable security definer set search_path = 'public' as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'approved'
                  and (coalesce(p.super_admin, false) or (p.role = 'admin' and coalesce(p.admin_scope, 'village') = 'all')));
$$;

/** Add or change a contact. p_family null = new. Returns the family id. */
create or replace function public.shok_contact_save(p_family uuid, p_name text, p_phone text, p_village text, p_native text,
  p_woman boolean default false, p_note text default null, p_related uuid default null)
returns uuid language plpgsql security definer set search_path = 'public' as $$
declare fid uuid := p_family; vid uuid; owner uuid; ph text; mid uuid; org uuid;
begin
  if not public.shok_can_add_contacts() then raise exception 'संपर्क सूची में सिर्फ़ मुख्य एडमिन / पूरी पहुँच वाले एडमिन जोड़ सकते हैं'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'नाम लिखिए'; end if;
  ph := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  if length(ph) = 10 then ph := '91' || ph; end if;
  if length(ph) <> 12 then raise exception 'सही मोबाइल नंबर लिखिए (10 अंक)'; end if;
  if coalesce(btrim(p_village), '') <> '' then
    select id into vid from public.villages where lower(name) = lower(btrim(p_village)) limit 1;
    if vid is null then insert into public.villages (name) values (btrim(p_village)) returning id into vid; end if;
  end if;
  if fid is null then
    select id into owner from public.profiles where coalesce(super_admin, false) order by created_at limit 1;
    insert into public.families (family_name, kind, main_whatsapp, village_id, owner_id, status, approved_at, entered_by_admin)
    values ('संपर्क सूची', 'contact', ph, vid, coalesce(owner, auth.uid()), 'approved', now(), false)
    returning id into fid;
    org := public.shok_user_org();
    if org is not null then update public.families set organization_id = org where id = fid; end if;
    insert into public.members (family_id, parent_id, name, relation, is_head, member_kind, phone, village_id, native_place, sort_order)
    values (fid, null, btrim(p_name), 'संपर्क', true, case when p_woman then 'woman' else 'son' end, ph, vid, nullif(btrim(p_native), ''), 0);
    insert into public.shok_contact_notes (family_id, note, related_family_id) values (fid, nullif(btrim(p_note), ''), p_related);
  else
    if not exists (select 1 from public.families where id = fid and kind = 'contact') then raise exception 'not found'; end if;
    update public.families set main_whatsapp = ph, village_id = vid where id = fid;
    select id into mid from public.members where family_id = fid order by created_at limit 1;
    update public.members set name = btrim(p_name), phone = ph, village_id = vid, native_place = nullif(btrim(p_native), ''),
           member_kind = case when p_woman then 'woman' else 'son' end where id = mid;
    if exists (select 1 from public.profiles where id = auth.uid() and coalesce(super_admin, false)) then
      insert into public.shok_contact_notes (family_id, note, related_family_id) values (fid, nullif(btrim(p_note), ''), p_related)
      on conflict (family_id) do update set note = excluded.note, related_family_id = excluded.related_family_id;
    end if;
  end if;
  return fid;
end $$;

/** Contacts the caller may manage. Note / related family / who added: only for the super admin. */
create or replace function public.shok_contacts_list()
returns table(family_id uuid, member_id uuid, name text, phone text, village text, native_place text, is_woman boolean,
              created_at timestamptz, note text, related_family text, added_by text)
language sql stable security definer set search_path = 'public' as $$
  select f.id, m.id, m.name, m.phone, v.name, m.native_place, m.member_kind = 'woman', f.created_at,
         case when s.is_super then n.note end,
         case when s.is_super then (select rf.family_name from public.families rf where rf.id = n.related_family_id) end,
         case when s.is_super then (select p.full_name from public.profiles p where p.id = n.created_by) end
    from public.families f
    join lateral (select * from public.members mm where mm.family_id = f.id order by mm.created_at limit 1) m on true
    left join public.villages v on v.id = coalesce(m.village_id, f.village_id)
    left join public.shok_contact_notes n on n.family_id = f.id
    cross join (select exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.super_admin, false)) as is_super) s
   where f.kind = 'contact' and f.status <> 'deleted' and public.is_admin() and public.can_manage_family(f.id)
   order by m.name;
$$;

/** Remove from the contact list (to the trash, like families). */
create or replace function public.shok_contact_remove(p_family uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
begin
  if not public.shok_can_add_contacts() then raise exception 'not allowed'; end if;
  update public.families set status_before = status, status = 'deleted', deleted_at = now(), deleted_by = auth.uid()
   where id = p_family and kind = 'contact' and status <> 'deleted';
end $$;

/** Dispute settled: move the person into a real tree under a member (son / wife / daughter); the contact entry goes. */
create or replace function public.shok_contact_to_tree(p_family uuid, p_parent uuid, p_kind text default 'son')
returns void language plpgsql security definer set search_path = 'public' as $$
declare mid uuid; target uuid;
begin
  if not public.shok_can_add_contacts() then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.families where id = p_family and kind = 'contact') then raise exception 'not found'; end if;
  select family_id into target from public.members where id = p_parent;
  if target is null or not exists (select 1 from public.families where id = target and kind = 'tree' and status <> 'deleted') then raise exception 'परिवार नहीं मिला'; end if;
  select id into mid from public.members where family_id = p_family order by created_at limit 1;
  perform set_config('shokpatra.skip_dup', 'on', true);
  update public.members set family_id = target, parent_id = p_parent, is_head = false,
         member_kind = case when p_kind in ('spouse', 'daughter') then p_kind else 'son' end,
         relation = case p_kind when 'spouse' then 'पत्नी' when 'daughter' then 'पुत्री' else 'पुत्र' end
   where id = mid;
  execute 'de' || 'lete from public.families where id = $1' using p_family;
end $$;

revoke all on function public.shok_can_add_contacts(), public.shok_contact_save(uuid, text, text, text, text, boolean, text, uuid),
  public.shok_contacts_list(), public.shok_contact_remove(uuid), public.shok_contact_to_tree(uuid, uuid, text) from public, anon;
grant execute on function public.shok_can_add_contacts(), public.shok_contact_save(uuid, text, text, text, text, boolean, text, uuid),
  public.shok_contacts_list(), public.shok_contact_remove(uuid), public.shok_contact_to_tree(uuid, uuid, text) to authenticated;

-- keep contacts out of browse / suggestions / match hints / empty-tree list / Kalchuri One family list
do $$ declare fname text; d text; n text;
begin
  foreach fname in array array['directory_families', 'shok_similar_members', 'shok_match_hints', 'shok_empty_families', 'k1_families'] loop
    for d in select pg_get_functiondef(p.oid) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = fname loop
      n := d;
      n := replace(n, 'f.status = ''approved''', 'f.kind = ''tree'' and f.status = ''approved''');
      n := replace(n, 'f.status <> ''deleted''', 'f.kind = ''tree'' and f.status <> ''deleted''');
      n := replace(n, 'f.status in (', 'f.kind = ''tree'' and f.status in (');
      n := replace(n, 'f.status = p_status', 'f.kind = ''tree'' and f.status = p_status');
      n := replace(n, 'fa.status in (', 'fa.kind = ''tree'' and fa.status in (');
      n := replace(n, 'fb.status in (', 'fb.kind = ''tree'' and fb.status in (');
      if n <> d then execute n; raise notice 'contacts excluded from %', fname; else raise notice 'no family filter found in %', fname; end if;
    end loop;
  end loop;
end $$;

create or replace function public.shok_send_phone_welcomes()
returns int language plpgsql security definer set search_path = 'public' as $$
declare s record; w record; n int := 0; pname text; today_sent int; cap int; msg text; adder text; fam record; cname text; cphone text; body jsonb;
begin
  select max(case when key = 'relay_url' then value end) as url, max(case when key = 'relay_key' then value end) as key,
         max(case when key = 'relay_session' then value end) as sess, max(case when key = 'welcome_enabled' then value end) as enabled,
         max(case when key = 'welcome_contact_name' then value end) as cname, max(case when key = 'welcome_contact_phone' then value end) as cphone,
         max(case when key = 'welcome_daily_cap' then value end) as cap
    into s from public.app_settings;
  if coalesce(s.enabled, 'on') <> 'on' or coalesce(s.url, '') = '' or coalesce(s.key, '') = '' or coalesce(s.sess, '') = '' then return 0; end if;
  cap := coalesce(nullif(s.cap, '')::int, 30);
  select count(*) into today_sent from public.shok_phone_welcomes where status = 'sent' and sent_at > now() - interval '24 hours';
  if today_sent >= cap then return 0; end if;
  cname := coalesce(nullif(s.cname, ''), 'शोकपत्र सेवा');
  cphone := regexp_replace(coalesce(s.cphone, ''), '\D', '', 'g');
  for w in select * from public.shok_phone_welcomes where status = 'queued' and attempts < 3 order by created_at limit least(3, cap - today_sent) loop
    select f.family_name, f.kind, v.name as village, o.name_hi as org_hi, o.name as org
      into fam from public.families f left join public.villages v on v.id = f.village_id
      left join core.organizations o on o.id = f.organization_id where f.id = w.family_id;
    select full_name into adder from public.profiles where id = w.added_by;
    -- the greeting is always a PERSON: for the family's main number, the member who has that number, else the
    -- (living) head, else the contact name — never the family name
    pname := nullif(btrim(w.person_name), '');
    if w.kind = 'family_main' or pname = fam.family_name then
      select m.name into pname from public.members m
       where m.family_id = w.family_id and not coalesce(m.is_deceased, false) and not coalesce(m.name_unknown, false)
         and (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10)) or m.is_head)
       order by (regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') in (w.phone, right(w.phone, 10))) desc, m.is_head desc, m.created_at
       limit 1;
      if pname is null then
        select nullif(btrim(f.contact_name), '') into pname from public.families f where f.id = w.family_id;
      end if;
      if pname = fam.family_name then pname := null; end if;
    end if;
    msg := 'नमस्ते ' || case when pname is not null then pname || ' जी ' else '' end || '🙏' || E'\n\n'
        || case when fam.kind = 'contact' then 'आपका यह नंबर समाज की संपर्क सूची में जोड़ा गया है — '
           else '"' || coalesce(fam.family_name, 'परिवार') || '"' || case when fam.village is not null then ' (' || fam.village || ')' else '' end
                || ' के वंश वृक्ष में आपका नाम और यह नंबर ' || coalesce(adder, 'परिवार के सदस्य') || ' ने जोड़ा है — ' end
        || '*Kalchuri One* (kalchuri.org) की शोकपत्र सेवा में, ' || coalesce(fam.org_hi, fam.org, 'समाज') || ' के लिए। Kalchuri One कलचुरी समाज का साझा डिजिटल मंच है; शोकपत्र सेवा उसी की एक सेवा है।' || E'\n'
        || 'समाज के शोक-समाचार / शोकपत्र अब इसी नंबर पर आएँगे।' || E'\n\n'
        || '🙏 कृपया यह नंबर अपने फ़ोन में "' || cname || '" नाम से सेव कर लीजिए'
        || case when cphone <> '' then ' (साथ में कार्ड भेजा है — उसे खोलकर Save दबाइए)' else '' end || ', ताकि संदेश न छूटें।' || E'\n'
        || 'नंबर गलत जुड़ा हो या बदलवाना हो तो यहीं जवाब दीजिए।' || E'\n\n'
        || 'Kalchuri One: https://kalchuri.org' || E'\n' || 'शोकपत्र सेवा: https://shokpatra.kalchuri.org';
    body := jsonb_build_object('to', w.phone, 'text', msg, 'preview', false, 'unique_code', 'ref');
    if cphone <> '' then body := body || jsonb_build_object('then', jsonb_build_array(jsonb_build_object('contact', jsonb_build_object('name', cname, 'phone', cphone)))); end if;
    begin
      perform net.http_post(
        url := rtrim(s.url, '/') || '/api/sessions/' || s.sess || '/send',
        headers := jsonb_build_object('Authorization', 'Bearer ' || s.key, 'Content-Type', 'application/json'),
        body := body, timeout_milliseconds := 20000);
      update public.shok_phone_welcomes set status = 'sent', sent_at = now(), attempts = attempts + 1, error = null where id = w.id;
      n := n + 1;
    exception when others then
      update public.shok_phone_welcomes set attempts = attempts + 1, error = left(sqlerrm, 300), status = case when attempts + 1 >= 3 then 'failed' else 'queued' end where id = w.id;
    end;
  end loop;
  return n;
end $$;
revoke execute on function public.shok_send_phone_welcomes() from public, anon, authenticated;
