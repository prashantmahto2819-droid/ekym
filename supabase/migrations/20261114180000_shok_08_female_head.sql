-- शोक पत्र / वंश वृक्ष: महिला मुखिया. Many households are run by a woman (widow, or husband away). A living wife
-- (member_kind 'spouse', stored under her husband) or a daughter can now be मुखिया. Lineage stays through the husband,
-- so a woman head is still a child row of her (usually स्व.) husband; for a household with only a woman, the app first
-- adds the husband as स्व. / "नाम याद नहीं" and then her as head.
-- 1) guard: spouse / daughter may be head (they still need a parent row, and nothing hangs under them)
create or replace function public.guard_member_kind()
returns trigger language plpgsql set search_path to 'public' as $function$
declare pk text;
begin
  if new.member_kind in ('spouse','daughter') then
    if new.parent_id is null then raise exception 'पत्नी/पुत्री किसी के नीचे ही जुड़ सकती है (महिला मुखिया के लिए पहले पति/पिता का नाम जोड़ें — याद न हो तो "नाम याद नहीं")'; end if;
  end if;
  if new.parent_id is not null then
    select member_kind into pk from public.members where id = new.parent_id;
    if pk in ('spouse','daughter') then raise exception 'पत्नी/पुत्री के नीचे अभी वंश आगे नहीं बढ़ाया जा सकता'; end if;
  end if;
  return new;
end $function$;

-- 2) any living member can be made head; a wife who becomes head takes over from her स्व. husband's head mark
create or replace function public.set_family_head(p_member uuid)
returns void language plpgsql security definer set search_path to 'public' as $function$
declare m public.members; f public.families;
begin
  select * into m from public.members where id = p_member;
  if not found then raise exception 'not found'; end if;
  select * into f from public.families where id = m.family_id;
  if not ((public.is_admin() and public.can_manage_family(f.id)) or (f.owner_id = auth.uid() and f.status in ('draft','rejected'))) then raise exception 'not allowed'; end if;
  if m.is_deceased then raise exception 'मुखिया जीवित सदस्य होना चाहिए'; end if;
  if m.name_unknown then raise exception 'पहले नाम भरिए, फिर मुखिया बनाइए'; end if;
  update public.members set is_head = true where id = p_member;
  if m.member_kind = 'spouse' and m.parent_id is not null then
    update public.members set is_head = false where id = m.parent_id and is_head and is_deceased;
  end if;
end $function$;

-- 3) nearest head above a member also counts a head wife of any ancestor (her sons' branch belongs to her)
create or replace function public.shok_branch_head(p_member uuid)
returns uuid language sql stable security definer set search_path to 'public' as $function$
  with recursive up as (
    select m.id, m.parent_id, m.is_head, 0 as depth from public.members m where m.id = p_member
    union all
    select p.id, p.parent_id, p.is_head, up.depth + 1 from public.members p join up on p.id = up.parent_id where up.depth < 30
  )
  select coalesce(case when up.is_head then up.id end,
                  (select s.id from public.members s where s.parent_id = up.id and s.member_kind = 'spouse' and s.is_head and not s.is_deceased limit 1))
    from up
   where up.is_head or exists (select 1 from public.members s where s.parent_id = up.id and s.member_kind = 'spouse' and s.is_head and not s.is_deceased)
   order by up.depth limit 1;
$function$;

-- 4) "eldest living son" of a wife = eldest son of her husband (sons are stored under the husband)
create or replace function public.shok_eldest_son_phone(p_member uuid, p_depth integer default 0)
returns table(member_id uuid, phone text, name text) language plpgsql stable security definer set search_path to 'public' as $function$
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
    if coalesce(s.phone, '') <> '' and coalesce((select x.whatsapp_ok from public.members x where x.id = s.id), true) then
      member_id := s.id; phone := s.phone; name := s.name; return next; return;
    end if;
    for r in select * from public.shok_eldest_son_phone(s.id, p_depth + 1) loop
      member_id := r.member_id; phone := r.phone; name := r.name; return next; return;
    end loop;
  end loop;
  return;
end $function$;
