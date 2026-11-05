-- शोकपत्र / वंश वृक्ष (owner, 2026-11-05):
-- 1. a family may have SEVERAL heads (मुखिया) — after a partition each branch has its own head; a head is the head of
--    his own branch (his subtree). "family main number" letters go to the branch head of each member.
-- 2. WhatsApp fallback: when a member's / head's number has no WhatsApp (marked by hand, or reported by the gateway
--    as not_on_whatsapp), the card addressed to him goes to his eldest living son's WhatsApp, then the branch head's,
--    then the family's main number. The recipient name stays the father's; `via_name` records whose phone carried it.

alter table public.members add column if not exists whatsapp_ok boolean;          -- null unknown · false = no WhatsApp on this number · true verified
alter table public.families add column if not exists main_whatsapp_ok boolean;
alter table public.letter_recipients add column if not exists via_member_id uuid references public.members(id) on delete set null,
                                      add column if not exists via_name text;

-- several heads: setting one no longer clears the others; removing is explicit
create or replace function public.set_family_head(p_member uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
declare m public.members; f public.families;
begin
  select * into m from public.members where id = p_member;
  if not found then raise exception 'not found'; end if;
  select * into f from public.families where id = m.family_id;
  if not ((public.is_admin() and public.can_manage_family(f.id)) or (f.owner_id = auth.uid() and f.status in ('draft','rejected'))) then raise exception 'not allowed'; end if;
  if m.is_deceased then raise exception 'head must be living'; end if;
  if coalesce(m.member_kind, 'son') <> 'son' then raise exception 'मुखिया पुरुष वंश-सदस्य होना चाहिए'; end if;
  update public.members set is_head = true where id = p_member;
end $$;

create or replace function public.unset_family_head(p_member uuid)
returns void language plpgsql security definer set search_path = 'public' as $$
declare m public.members; f public.families; n int;
begin
  select * into m from public.members where id = p_member;
  if not found then raise exception 'not found'; end if;
  select * into f from public.families where id = m.family_id;
  if not ((public.is_admin() and public.can_manage_family(f.id)) or (f.owner_id = auth.uid() and f.status in ('draft','rejected'))) then raise exception 'not allowed'; end if;
  select count(*) into n from public.members where family_id = m.family_id and is_head;
  if n <= 1 then raise exception 'परिवार में कम से कम एक मुखिया रहना चाहिए'; end if;
  update public.members set is_head = false where id = p_member;
end $$;
grant execute on function public.unset_family_head(uuid) to authenticated;

-- nearest head above (or self)
create or replace function public.shok_branch_head(p_member uuid)
returns uuid language sql stable security definer set search_path = 'public' as $$
  with recursive up as (
    select m.id, m.parent_id, m.is_head, 0 as depth from public.members m where m.id = p_member
    union all
    select p.id, p.parent_id, p.is_head, up.depth + 1 from public.members p join up on p.id = up.parent_id where up.depth < 30
  )
  select id from up where is_head order by depth limit 1;
$$;

-- eldest living son with a usable WhatsApp number (recursing down: son → grandson …)
create or replace function public.shok_eldest_son_phone(p_member uuid, p_depth int default 0)
returns table (member_id uuid, phone text, name text) language plpgsql stable security definer set search_path = 'public' as $$
declare s record; r record;
begin
  if p_depth > 4 then return; end if;
  for s in select m.id, m.phone, m.name from public.members m
            where m.parent_id = p_member and coalesce(m.member_kind, 'son') = 'son' and not m.is_deceased and not m.name_unknown
            order by m.sort_order, m.created_at loop
    if coalesce(s.phone, '') <> '' and coalesce((select x.whatsapp_ok from public.members x where x.id = s.id), true) then
      member_id := s.id; phone := s.phone; name := s.name; return next; return;
    end if;
    for r in select * from public.shok_eldest_son_phone(s.id, p_depth + 1) loop
      member_id := r.member_id; phone := r.phone; name := r.name; return next; return;
    end loop;
  end loop;
  return;
end $$;

-- where does the card for p_member go? returns phone + via (null via = the person himself / family main)
create or replace function public.shok_deliver_phone(p_member uuid, p_mode text)
returns table (phone text, via_member_id uuid, via_name text) language plpgsql stable security definer set search_path = 'public' as $$
declare m public.members; f public.families; head public.members; r record;
begin
  select * into m from public.members where id = p_member;
  select * into f from public.families where id = m.family_id;
  select * into head from public.members where id = public.shok_branch_head(p_member);
  if p_mode = 'each_member' then
    if coalesce(m.phone, '') <> '' and coalesce(m.whatsapp_ok, true) then phone := m.phone; via_member_id := null; via_name := null; return next; return; end if;
    for r in select * from public.shok_eldest_son_phone(m.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  -- family_main (or each_member with nothing above): the branch head, his eldest son, the family's main number
  if head.id is not null and head.id <> m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) then
    phone := head.phone; via_member_id := head.id; via_name := head.name; return next; return;
  end if;
  if head.id is not null and head.id = m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) and p_mode <> 'each_member' then
    phone := head.phone; via_member_id := null; via_name := null; return next; return;
  end if;
  if head.id is not null then
    for r in select * from public.shok_eldest_son_phone(head.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  if coalesce(f.main_whatsapp, '') <> '' and coalesce(f.main_whatsapp_ok, true) then phone := f.main_whatsapp; via_member_id := null; via_name := 'परिवार का मुख्य नंबर'; return next; return; end if;
  -- last resort: anything usable in the branch head's line, else the member's own number even if unverified
  if coalesce(m.phone, '') <> '' then phone := m.phone; via_member_id := null; via_name := null; return next; return; end if;
  return;
end $$;

create or replace function public.create_letter_recipients(p_letter_id uuid, p_member_ids uuid[], p_allow_repeat boolean default false)
returns table (recipient_id uuid, member_id uuid, recipient_name text, father_name text, village_name text)
language plpgsql security definer set search_path = 'public' as $$
#variable_conflict use_column
declare l public.letters;
begin
  select * into l from public.letters where id = p_letter_id;
  if l.id is null or (l.created_by is distinct from auth.uid() and not public.is_admin()) then raise exception 'not allowed'; end if;
  if not public.is_approved() then raise exception 'account not approved'; end if;
  if l.status <> 'draft' then raise exception 'letter already queued'; end if;
  delete from public.letter_recipients lr where lr.letter_id = p_letter_id and lr.status = 'queued';
  return query
  with ins as (
    insert into public.letter_recipients (letter_id, member_id, family_id, recipient_name, father_name, village_name, phone, via_member_id, via_name)
    select p_letter_id, m.id, f.id, m.name, case when m.member_kind = 'spouse' then null else par.name end, v.name, d.phone, d.via_member_id, d.via_name
    from (select distinct unnest(p_member_ids) as mid) sel
    join public.members m on m.id = sel.mid
    join public.families f on f.id = m.family_id and f.status = 'approved'
    left join public.members par on par.id = m.parent_id
    left join public.villages v on v.id = coalesce(m.village_id, f.village_id)
    left join lateral public.shok_deliver_phone(m.id, l.send_mode) d on true
    where not m.is_deceased and not m.name_unknown and d.phone is not null
      and (p_allow_repeat or not exists (
        select 1 from public.letter_recipients lr2 join public.letters l2 on l2.id = lr2.letter_id
        where lr2.member_id = m.id and l2.id <> p_letter_id and l2.status not in ('draft','rejected')
          and lr2.status in ('queued','sending','sent')
          and lower(btrim(l2.deceased_name)) = lower(btrim(l.deceased_name))
          and l2.ceremony_date is not distinct from l.ceremony_date))
    returning id, member_id, recipient_name, father_name, village_name
  )
  select ins.id, ins.member_id, ins.recipient_name, ins.father_name, ins.village_name from ins;
end $$;

-- gateway said "not on WhatsApp": remember it on the number's owner and re-route this recipient. Returns the new phone (null = nothing left).
create or replace function public.shok_reroute_recipient(p_recipient uuid)
returns jsonb language plpgsql security definer set search_path = 'public' as $$
declare r public.letter_recipients; l public.letters; m public.members; d record;
begin
  select * into r from public.letter_recipients where id = p_recipient;
  if r is null then return null; end if;
  select * into l from public.letters where id = r.letter_id;
  -- whose number was it?
  if r.via_member_id is not null then update public.members set whatsapp_ok = false where id = r.via_member_id and phone = r.phone;
  else
    select * into m from public.members where id = r.member_id;
    if m.phone = r.phone then update public.members set whatsapp_ok = false where id = m.id;
    else update public.families set main_whatsapp_ok = false where id = r.family_id and main_whatsapp = r.phone; end if;
  end if;
  select * into d from public.shok_deliver_phone(r.member_id, l.send_mode);
  if d.phone is null or d.phone = r.phone then return null; end if;
  update public.letter_recipients set phone = d.phone, via_member_id = d.via_member_id, via_name = d.via_name, status = 'queued', error = null where id = p_recipient;
  return jsonb_build_object('phone', d.phone, 'via_name', d.via_name);
end $$;
revoke execute on function public.shok_reroute_recipient(uuid) from public, anon, authenticated;

-- send review in the apps: who will actually receive each member's card
create or replace function public.letter_recipients_review(p_letter_id uuid)
returns table (recipient_id uuid, recipient_name text, father_name text, village_name text, via_name text, status text, error text)
language sql stable security definer set search_path = 'public' as $$
  select lr.id, lr.recipient_name, lr.father_name, lr.village_name, lr.via_name, lr.status, lr.error
    from public.letter_recipients lr join public.letters l on l.id = lr.letter_id
   where lr.letter_id = p_letter_id and (l.created_by = auth.uid() or public.is_admin())
   order by lr.village_name, lr.recipient_name;
$$;
grant execute on function public.letter_recipients_review(uuid) to authenticated;
