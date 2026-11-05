-- second WhatsApp number (members.phone2) is tried before falling back to the eldest son / branch head
create or replace function public.shok_deliver_phone(p_member uuid, p_mode text)
returns table (phone text, via_member_id uuid, via_name text) language plpgsql stable security definer set search_path = 'public' as $$
declare m public.members; f public.families; head public.members; r record;
begin
  select * into m from public.members where id = p_member;
  select * into f from public.families where id = m.family_id;
  select * into head from public.members where id = public.shok_branch_head(p_member);
  if p_mode = 'each_member' then
    if coalesce(m.phone, '') <> '' and coalesce(m.whatsapp_ok, true) then phone := m.phone; via_member_id := null; via_name := null; return next; return; end if;
    if coalesce(m.phone2, '') <> '' and m.phone2 is distinct from m.phone then phone := m.phone2; via_member_id := null; via_name := 'दूसरा नंबर'; return next; return; end if;
    for r in select * from public.shok_eldest_son_phone(m.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  if head.id is not null and head.id <> m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) then
    phone := head.phone; via_member_id := head.id; via_name := head.name; return next; return;
  end if;
  if head.id is not null and head.id = m.id and coalesce(head.phone, '') <> '' and coalesce(head.whatsapp_ok, true) and p_mode <> 'each_member' then
    phone := head.phone; via_member_id := null; via_name := null; return next; return;
  end if;
  if head.id is not null and coalesce(head.phone2, '') <> '' and head.phone2 is distinct from head.phone then
    phone := head.phone2; via_member_id := head.id; via_name := head.name || ' (दूसरा नंबर)'; return next; return;
  end if;
  if head.id is not null then
    for r in select * from public.shok_eldest_son_phone(head.id) loop phone := r.phone; via_member_id := r.member_id; via_name := r.name; return next; return; end loop;
  end if;
  if coalesce(f.main_whatsapp, '') <> '' and coalesce(f.main_whatsapp_ok, true) then phone := f.main_whatsapp; via_member_id := null; via_name := 'परिवार का मुख्य नंबर'; return next; return; end if;
  if coalesce(m.phone, '') <> '' then phone := m.phone; via_member_id := null; via_name := null; return next; return;
  end if;
  return;
end $$;
