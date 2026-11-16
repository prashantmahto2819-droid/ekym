do $$
declare r record; me uuid; s record;
begin
  select id into me from auth.users where email = 'prashantmahto2819@gmail.com';
  raise notice 'me=%', me;
  for s in
    select distinct u.id, u.created_at, u.last_sign_in_at, left(coalesce(u.email,''),3) || '…' em, right(coalesce(u.phone,''),4) ph, public.k1_user_name(u.id) nm
      from auth.users u
      left join public.org_memberships m on m.user_id = u.id
      left join public.site_profiles sp on sp.id = u.id
      left join public.cm_user_profiles cp on cp.user_id = u.id
     where coalesce(m.full_name,'') ~* '(saurabh|सौरभ)' or coalesce(sp.full_name,'') ~* '(saurabh|सौरभ)' or coalesce(cp.display_name,'') ~* '(saurabh|सौरभ)' or coalesce(u.email,'') ~* 'saurabh'
  loop
    raise notice 'USER % name=% email=% phone=..% created=% last_login=%', s.id, s.nm, s.em, s.ph, s.created_at::date, s.last_sign_in_at;
    raise notice '  dm_from=% blocks_me=% i_block=%', (select dm_from from public.cm_user_profiles where user_id = s.id),
      exists(select 1 from public.cm_chat_blocks where user_id = s.id and blocked_id = me), exists(select 1 from public.cm_chat_blocks where user_id = me and blocked_id = s.id);
    raise notice '  memberships: %', (select string_agg(o.name || ':' || m.status, ', ') from public.org_memberships m join core.organizations o on o.id = m.organization_id where m.user_id = s.id);
    for r in select ro.id, ro.archived, ro.organization_id, ro.created_at, ro.last_message_at,
                    (select count(*) from public.cm_chat_members x where x.room_id = ro.id) mem,
                    exists(select 1 from public.cm_chat_members x where x.room_id = ro.id and x.user_id = s.id) has_him,
                    (select last_read_at from public.cm_chat_members x where x.room_id = ro.id and x.user_id = s.id) his_read,
                    (select count(*) from public.cm_chat_messages mm where mm.room_id = ro.id and mm.sender_id = me) from_me,
                    (select count(*) from public.cm_chat_messages mm where mm.room_id = ro.id and mm.sender_id = s.id) from_him,
                    (select max(created_at) from public.cm_chat_messages mm where mm.room_id = ro.id) last_msg
               from public.cm_chat_rooms ro where ro.kind = 'dm' and ro.dm_key like '%' || s.id::text || '%' loop
      raise notice '  DM room % archived=% members=% has_him=% his_read=% from_me=% from_him=% last=%', r.id, r.archived, r.mem, r.has_him, r.his_read, r.from_me, r.from_him, r.last_msg;
    end loop;
    raise notice '  notifications chat_dm to him: %, unread: %', (select count(*) from public.cm_notifications n where n.user_id = s.id and n.kind = 'chat_dm'),
      (select count(*) from public.cm_notifications n where n.user_id = s.id and n.kind = 'chat_dm' and n.read_at is null);
  end loop;
  raise notice 'all DM rooms of me: %', (select count(*) from public.cm_chat_rooms ro where ro.kind='dm' and ro.dm_key like '%' || me::text || '%');
  raise notice 'DM rooms anywhere with 1 member: %', (select count(*) from public.cm_chat_rooms ro where ro.kind='dm' and (select count(*) from public.cm_chat_members x where x.room_id = ro.id) < 2);
exception when others then raise notice 'ERR % %', sqlstate, sqlerrm;
end $$;
