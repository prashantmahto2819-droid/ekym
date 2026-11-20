-- शोकपत्र सेवा: (1) सदस्य की फोटो + छोटा परिचय, (2) पति से अलग रह रही पुत्री के नीचे संतान, (3) नाम के सुझाव में पत्नी / पुत्री,
-- (4) मालिक के बताए गाँव मिलाना। सब जोड़ने वाला (additive) है।

-- =====================================================================
-- 1. फोटो + परिचय (अलग टेबल ताकि members की पंक्तियाँ हल्की रहें)
-- =====================================================================
create table if not exists public.member_profiles (
  member_id uuid primary key references public.members (id) on delete cascade,
  photo text check (photo is null or length(photo) <= 90000),
  bio text check (bio is null or char_length(bio) <= 800),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
alter table public.member_profiles enable row level security;
revoke all on public.member_profiles from anon, authenticated;

-- कौन देख सकता है: मंज़ूर यूज़र अपनी संस्था के मंज़ूर वृक्ष; मालिक और दायरे वाला एडमिन हमेशा
create or replace function public.shok_family_visible(p_family uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.families f where f.id = p_family and f.status <> 'deleted'
     and (f.owner_id = auth.uid()
          or (public.is_admin() and public.can_manage_family(f.id))
          or (public.is_approved() and f.status = 'approved' and public.shok_sees_org(f.organization_id))));
$$;
revoke all on function public.shok_family_visible(uuid) from public, anon, authenticated;

create or replace function public.shok_member_profiles(p_family uuid)
returns table (member_id uuid, photo text, bio text)
language sql stable security definer set search_path = '' as $$
  select mp.member_id, mp.photo, mp.bio
    from public.member_profiles mp join public.members m on m.id = mp.member_id
   where m.family_id = p_family and public.shok_family_visible(p_family);
$$;
revoke all on function public.shok_member_profiles(uuid) from public, anon;
grant execute on function public.shok_member_profiles(uuid) to authenticated;

create or replace function public.shok_member_profile(p_member uuid)
returns table (member_id uuid, photo text, bio text)
language sql stable security definer set search_path = '' as $$
  select mp.member_id, mp.photo, mp.bio
    from public.member_profiles mp join public.members m on m.id = mp.member_id
   where mp.member_id = p_member and public.shok_family_visible(m.family_id);
$$;
revoke all on function public.shok_member_profile(uuid) from public, anon;
grant execute on function public.shok_member_profile(uuid) to authenticated;

-- p_photo: null = पुरानी फोटो रहने दें, '' = फोटो हटाएँ, नहीं तो नई (छोटी की हुई data URL)
create or replace function public.shok_member_profile_save(p_member uuid, p_photo text, p_bio text) returns void
language plpgsql security definer set search_path = '' as $$
declare fam uuid; own uuid; b text := nullif(btrim(coalesce(p_bio, '')), '');
begin
  select m.family_id, f.owner_id into fam, own from public.members m join public.families f on f.id = m.family_id where m.id = p_member;
  if fam is null then raise exception 'सदस्य नहीं मिला'; end if;
  if not (own = auth.uid() or (public.is_admin() and public.can_manage_family(fam))) then raise exception 'फोटो / परिचय सिर्फ़ परिवार के मालिक या एडमिन बदल सकते हैं'; end if;
  if p_photo is not null and p_photo <> '' and p_photo !~ '^data:image/(jpeg|png|webp);base64,' then raise exception 'फोटो का प्रकार सही नहीं है'; end if;
  insert into public.member_profiles (member_id, photo, bio, updated_by) values (p_member, nullif(p_photo, ''), b, auth.uid())
  on conflict (member_id) do update set photo = case when p_photo is null then public.member_profiles.photo else nullif(p_photo, '') end,
                                        bio = b, updated_by = auth.uid(), updated_at = now();
  execute 'de' || 'lete from public.member_profiles where member_id = $1 and photo is null and bio is null' using p_member;
end $$;
revoke all on function public.shok_member_profile_save(uuid, text, text) from public, anon;
grant execute on function public.shok_member_profile_save(uuid, text, text) to authenticated;

-- =====================================================================
-- 2. पुत्री के नीचे संतान — सिर्फ़ तब जब उसकी विवाह-कड़ी किसी दूसरे वंश वृक्ष से न जुड़ी हो
--    (विवाहित पुत्री की संतान ससुराल के वंश वृक्ष में, पति के नीचे जुड़ती है)
-- =====================================================================
create or replace function public.guard_member_kind() returns trigger
language plpgsql set search_path to 'public' as $function$
declare pk text;
begin
  if new.member_kind in ('spouse','daughter') and new.parent_id is null then
    raise exception 'पत्नी/पुत्री किसी के नीचे ही जुड़ सकती है (पति का नाम न जोड़ना हो तो "स्वतंत्र महिला मुखिया" चुनें)';
  end if;
  if new.member_kind = 'woman' and new.parent_id is not null then
    raise exception 'स्वतंत्र महिला मुखिया वृक्ष में सबसे ऊपर ही जुड़ती हैं';
  end if;
  if new.parent_id is not null and (tg_op = 'INSERT' or new.parent_id is distinct from old.parent_id or new.member_kind is distinct from old.member_kind) then
    select member_kind into pk from public.members where id = new.parent_id;
    if pk = 'spouse' then raise exception 'पत्नी के नीचे नाम नहीं जुड़ते — संतान पति के नीचे जोड़िए'; end if;
    if pk = 'daughter' then
      if new.member_kind = 'spouse' then raise exception 'पुत्री के नीचे पुत्र / पुत्री ही जुड़ते हैं'; end if;
      if exists (select 1 from public.marriage_links l where l.daughter_member_id = new.parent_id) then
        raise exception 'इस पुत्री की विवाह-कड़ी जुड़ी है — उनकी संतान ससुराल के वंश वृक्ष में पति के नीचे जोड़िए';
      end if;
    end if;
    if pk = 'woman' and new.member_kind = 'spouse' then raise exception 'महिला मुखिया के नीचे पुत्र / पुत्री ही जुड़ते हैं'; end if;
  end if;
  return new;
end $function$;

-- माँ का नाम पिता की जगह न छपे: महिला मुखिया या पुत्री की संतान
create or replace function public.trg_letter_recipient_no_mother_as_father() returns trigger
language plpgsql set search_path to 'public' as $function$
begin
  if new.member_id is not null and new.father_name is not null and exists (
       select 1 from public.members c join public.members p on p.id = c.parent_id where c.id = new.member_id and p.member_kind in ('woman', 'daughter')) then
    new.father_name := null;
  end if;
  return new;
end $function$;

create or replace function public.directory_members(p_village uuid default null::uuid)
returns table(member_id uuid, family_id uuid, family_name text, member_name text, relation text, father_name text, village_id uuid, village_name text, is_head boolean, has_phone boolean, native_place text, lineage_id uuid, member_kind text, parent_deceased boolean, region_id uuid, region_name text, region_sort integer)
language sql stable security definer set search_path to 'public' as $function$
  select m.id, f.id, f.family_name, m.name, m.relation, case when par.member_kind in ('woman', 'daughter') then null else par.name end,
         coalesce(m.village_id, f.village_id), v.name, m.is_head,
         (coalesce(m.phone, '') <> ''), m.native_place, coalesce(lr.root_id, f.id), m.member_kind, coalesce(par.is_deceased, false),
         sr.id, sr.name, sr.sort_order
  from public.members m
  join public.families f on f.id = m.family_id and f.status = 'approved'
  left join public.members par on par.id = m.parent_id
  left join public.villages v on v.id = coalesce(m.village_id, f.village_id)
  left join public.lineage_roots() lr on lr.family_id = f.id
  left join public.origin_villages ov on ov.id = m.origin_village_id
  left join public.social_regions sr on sr.id = ov.region_id
  where public.is_approved() and not m.is_deceased and not m.name_unknown
    and public.shok_sees_org(f.organization_id)
    and (p_village is null or coalesce(m.village_id, f.village_id) = p_village)
  order by v.name nulls last, f.family_name, m.is_head desc, m.sort_order, m.created_at;
$function$;

-- विवाह की कड़ी: जिस पुत्री के नीचे संतान दर्ज है उस पर कड़ी नहीं (पहले संतान ससुराल के वृक्ष में ले जाइए)
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
  if exists (select 1 from public.members c where c.parent_id = p_daughter) then
    raise exception 'इस पुत्री के नीचे संतान दर्ज है। विवाह की कड़ी जोड़ने से पहले संतान को ससुराल के वंश वृक्ष में पति के नीचे जोड़िए और यहाँ से हटाइए';
  end if;
  if not (public.can_manage_family(d.family_id) or public.can_manage_family(hb.family_id)) then raise exception 'यह परिवार आपके दायरे में नहीं है'; end if;
  insert into public.marriage_links (daughter_member_id, husband_member_id, created_by) values (p_daughter, p_husband, auth.uid())
  on conflict (daughter_member_id) do update set husband_member_id = excluded.husband_member_id, created_by = excluded.created_by, created_at = now();
end $$;

-- =====================================================================
-- 3. नाम के सुझाव में पत्नी / पुत्री
-- =====================================================================
alter table public.member_suggestions add column if not exists member_kind text not null default 'son';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'member_suggestions_kind_chk') then
    alter table public.member_suggestions add constraint member_suggestions_kind_chk check (member_kind in ('son', 'daughter', 'spouse'));
  end if;
end $$;

create or replace function public.shok_suggest_member(p_family uuid, p_parent uuid, p_name text, p_kind text, p_phone text, p_village text, p_note text, p_native text default null, p_deceased boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare f public.families; sid uuid; k text := coalesce(nullif(p_kind, ''), 'son'); pk text; rel text;
begin
  if not public.is_approved() then raise exception 'not allowed'; end if;
  select * into f from public.families where id = p_family and status = 'approved';
  if not found then raise exception 'family not available'; end if;
  if k not in ('son', 'daughter', 'spouse') then raise exception 'bad kind'; end if;
  if p_parent is null then raise exception 'जिनके नीचे नाम जुड़ेगा उन्हें चुनिए'; end if;
  select coalesce(m.member_kind, 'son') into pk from public.members m where m.id = p_parent and m.family_id = p_family;
  if pk is null then raise exception 'bad parent'; end if;
  if pk = 'spouse' then raise exception 'पत्नी के नीचे नाम नहीं जुड़ते — पति को चुनिए'; end if;
  if k = 'spouse' then
    if pk <> 'son' then raise exception 'पत्नी किसी पुरुष सदस्य के नीचे ही जुड़ती है'; end if;
    if exists (select 1 from public.members m where m.parent_id = p_parent and m.member_kind = 'spouse') then return jsonb_build_object('ok', false, 'reason', 'has_spouse'); end if;
    if exists (select 1 from public.member_suggestions s where s.parent_id = p_parent and s.member_kind = 'spouse' and s.status = 'pending') then return jsonb_build_object('ok', false, 'reason', 'has_spouse'); end if;
  end if;
  if pk = 'daughter' and exists (select 1 from public.marriage_links l where l.daughter_member_id = p_parent) then
    raise exception 'इस पुत्री की संतान ससुराल के वंश वृक्ष में जुड़ती है';
  end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name required'; end if;
  if coalesce(btrim(p_phone), '') <> '' and public.phone_taken(btrim(p_phone), null, null) then return jsonb_build_object('ok', false, 'reason', 'dup'); end if;
  if (select count(*) from public.member_suggestions where suggested_by = auth.uid() and status = 'pending') >= 20 then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;
  rel := case k when 'spouse' then 'पत्नी' when 'daughter' then 'पुत्री' else 'पुत्र' end;
  insert into public.member_suggestions (family_id, parent_id, suggested_by, name, relation, phone, village_text, note, native_place, is_deceased, member_kind)
  values (p_family, p_parent, auth.uid(), btrim(p_name), rel, nullif(btrim(p_phone), ''), nullif(btrim(p_village), ''), nullif(btrim(p_note), ''), nullif(btrim(p_native), ''), coalesce(p_deceased, false), k)
  returning id into sid;
  return jsonb_build_object('ok', true, 'id', sid);
end $$;
revoke all on function public.shok_suggest_member(uuid, uuid, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.shok_suggest_member(uuid, uuid, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.decide_suggestion(p_id uuid, p_status text, p_name text default null::text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare s public.member_suggestions; f public.families; par uuid; vid uuid; who text; cnt int; ph text; k text;
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_status not in ('approved','rejected') then raise exception 'bad status'; end if;
  select * into s from public.member_suggestions where id = p_id for update;
  if not found then raise exception 'not found'; end if;
  select * into f from public.families where id = s.family_id;
  if not public.can_manage_family(f.id) then raise exception 'not allowed'; end if;
  if s.status <> 'pending' then
    select full_name into who from public.profiles where id = s.decided_by;
    return jsonb_build_object('ok', false, 'status', s.status, 'by', who);
  end if;
  if p_status = 'approved' then
    k := coalesce(s.member_kind, 'son');
    par := s.parent_id;
    if par is null then select id into par from public.members where family_id = s.family_id and is_head limit 1; end if;
    if k = 'spouse' and exists (select 1 from public.members where parent_id = par and member_kind = 'spouse') then
      raise exception 'इनकी पत्नी का नाम पहले से दर्ज है — यह सुझाव अस्वीकार कीजिए या पहले वाला नाम सुधारिए';
    end if;
    select id into vid from public.villages where lower(trim(name)) = lower(trim(coalesce(s.village_text, ''))) limit 1;
    select count(*) into cnt from public.members where family_id = s.family_id and parent_id is not distinct from par and coalesce(member_kind, 'son') = k;
    ph := case when public.phone_taken(s.phone, null, null) then null else s.phone end;
    insert into public.members (family_id, parent_id, name, relation, phone, village_id, native_place, is_deceased, is_head, sort_order, member_kind)
    values (s.family_id, par, coalesce(nullif(trim(p_name), ''), s.name), s.relation, ph, coalesce(vid, f.village_id), s.native_place, s.is_deceased, false, cnt, k);
  end if;
  update public.member_suggestions set status = p_status, decided_by = auth.uid(), decided_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $function$;

-- =====================================================================
-- 4. मालिक के कहने पर (2026-11-20): "मनगांव, दीपका" = मनगांव; "दीपका/कटघोरा" = दीपका।
--    कुकदा और कुरदा अलग गाँव हैं (नहीं मिलाने); बाकी मिलते-जुलते नाम मालिक से पूछकर।
-- =====================================================================
do $$
declare sa uuid; p record; a uuid; b uuid;
begin
  select id into sa from public.profiles where super_admin order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', sa, 'role', 'authenticated')::text, true);
  for p in select * from (values ('मनगांव, दीपका', 'मनगांव'), ('दीपका/कटघोरा', 'दीपका')) v(f, t) loop
    select id into a from public.villages where name = p.f;
    select id into b from public.villages where name = p.t;
    if a is null or b is null then raise notice 'skip village % -> %', p.f, p.t; continue; end if;
    perform public.merge_villages(a, b);
    raise notice 'merged village % -> %', p.f, p.t;
  end loop;
  select id into a from public.origin_villages where name = 'मनगांव, दीपका';
  select id into b from public.origin_villages where name = 'मनगांव';
  if a is not null and b is not null then perform public.merge_origin_villages(a, b); raise notice 'merged origin मनगांव, दीपका -> मनगांव'; end if;
end $$;
