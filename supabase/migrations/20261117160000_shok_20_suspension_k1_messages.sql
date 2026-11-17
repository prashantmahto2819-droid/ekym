-- सदस्यता निलंबन Kalchuri One पर भी: निलंबित व्यक्ति (वंश वृक्ष में निलंबित सदस्य, नंबर से पहचाना) को
-- * comms_messages (WhatsApp / ईमेल: आयोजन निमंत्रण, सूचना, अभियान, सारांश, चैट अलर्ट …) नहीं — पंक्ति 'blocked' बनती है।
--   छूट: लॉगिन OTP (purpose authentication), दान / भुगतान रसीद, रक्त की आपात ज़रूरत।
-- * चैट: उसे कोई सीधा (DM) संदेश नहीं भेजा जा सकता।

-- निलंबित लोगों के नंबर (आख़िरी 10 अंक)
create or replace function public.shok_suspended_phone10() returns setof text
language sql stable security definer set search_path = '' as $$
  select distinct right(regexp_replace(x, '\D', '', 'g'), 10)
    from public.members m, lateral (values (m.phone), (m.phone2)) v(x)
   where m.suspended_at is not null and (m.suspended_until is null or m.suspended_until >= current_date)
     and length(regexp_replace(coalesce(x, ''), '\D', '', 'g')) >= 10;
$$;
revoke all on function public.shok_suspended_phone10() from public, anon, authenticated;

-- यह नंबर / ईमेल किसी निलंबित व्यक्ति का?
create or replace function public.k1_contact_suspended(p_contact text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare c text := lower(btrim(coalesce(p_contact, ''))); d text;
begin
  if c = '' then return false; end if;
  if not exists (select 1 from public.members m where m.suspended_at is not null) then return false; end if;
  if position('@' in c) > 0 then
    return exists (select 1 from public.profiles p where lower(btrim(p.email)) = c
                     and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10()))
        or exists (select 1 from public.org_memberships om where lower(btrim(om.email)) = c
                     and (right(regexp_replace(coalesce(om.mobile, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10())
                          or right(regexp_replace(coalesce(om.whatsapp, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10())));
  end if;
  d := right(regexp_replace(c, '\D', '', 'g'), 10);
  return length(d) = 10 and d in (select public.shok_suspended_phone10());
end $$;
revoke all on function public.k1_contact_suspended(text) from public, anon;
grant execute on function public.k1_contact_suspended(text) to authenticated;

-- यह खाता किसी निलंबित व्यक्ति का?
create or replace function public.k1_user_suspended(p_user uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_user is null or not exists (select 1 from public.members m where m.suspended_at is not null) then return false; end if;
  return exists (select 1 from public.profiles p where p.id = p_user
                   and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10()))
      or exists (select 1 from public.org_memberships om where om.user_id = p_user
                   and (right(regexp_replace(coalesce(om.mobile, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10())
                        or right(regexp_replace(coalesce(om.whatsapp, ''), '\D', '', 'g'), 10) in (select public.shok_suspended_phone10())));
end $$;
revoke all on function public.k1_user_suspended(uuid) from public, anon;
grant execute on function public.k1_user_suspended(uuid) to authenticated;

-- WhatsApp / ईमेल कतार: निलंबित व्यक्ति के संदेश रोकें
create or replace function public.trg_comms_not_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('queued', 'sending')
     and new.purpose <> 'authentication'
     and coalesce(new.ref_table, '') not in ('donations', 'payment_transactions', 'blood_requirements')
     and public.k1_contact_suspended(new.to_contact) then
    new.status := 'blocked';
    new.error := 'सदस्यता निलंबित';
  end if;
  return new;
end $$;
drop trigger if exists trg_comms_not_suspended on public.comms_messages;
create trigger trg_comms_not_suspended before insert or update of status on public.comms_messages
  for each row execute function public.trg_comms_not_suspended();

-- चैट: निलंबित व्यक्ति को सीधा संदेश नहीं
create or replace function public.trg_chat_dm_not_suspended() returns trigger
language plpgsql security definer set search_path = '' as $$
declare other uuid;
begin
  if not exists (select 1 from public.members m where m.suspended_at is not null) then return new; end if;
  select cm.user_id into other from public.cm_chat_rooms r join public.cm_chat_members cm on cm.room_id = r.id
   where r.id = new.room_id and r.kind = 'dm' and cm.user_id <> new.sender_id limit 1;
  if other is not null and public.k1_user_suspended(other) then
    raise exception 'इस सदस्य की सदस्यता अभी निलंबित है, इन्हें संदेश नहीं भेजा जा सकता';
  end if;
  return new;
end $$;
drop trigger if exists trg_chat_dm_not_suspended on public.cm_chat_messages;
create trigger trg_chat_dm_not_suspended before insert on public.cm_chat_messages
  for each row execute function public.trg_chat_dm_not_suspended();

-- निलंबित करते समय कतार में पड़े Kalchuri One संदेश भी रोकें
create or replace function public.trg_member_suspended_block_comms() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.suspended_at is not null and old.suspended_at is null then
    update public.comms_messages c set status = 'blocked', error = 'सदस्यता निलंबित'
     where c.status = 'queued' and c.purpose <> 'authentication'
       and coalesce(c.ref_table, '') not in ('donations', 'payment_transactions', 'blood_requirements')
       and public.k1_contact_suspended(c.to_contact);
  end if;
  return new;
end $$;
drop trigger if exists trg_member_suspended_block_comms on public.members;
create trigger trg_member_suspended_block_comms after update of suspended_at on public.members
  for each row execute function public.trg_member_suspended_block_comms();
