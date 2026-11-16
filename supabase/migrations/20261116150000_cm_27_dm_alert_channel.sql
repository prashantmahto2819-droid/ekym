-- DM सूचना: बातचीत Kalchuri One (मूल) संस्था की होती है, जिसका अपना WhatsApp चैनल न हो तो पाने वाले की किसी ऐसी संस्था
-- का चैनल लें जिसमें वह सक्रिय सदस्य है और जिसका WhatsApp / ईमेल चैनल चालू है।
create or replace function public.k1_chat_alert_org(p_room_org uuid, p_user uuid, p_kind text)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    case when public.k1_pick_channel(p_room_org, p_kind) is not null then p_room_org end,
    (select m.organization_id from public.org_memberships m where m.user_id = p_user and m.status = 'active'
        and public.k1_pick_channel(m.organization_id, p_kind) is not null order by m.is_base desc, m.created_at limit 1),
    p_room_org);
$$;
revoke all on function public.k1_chat_alert_org(uuid, uuid, text) from public, anon, authenticated;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.trg_cm_chat_dm_alert()'::regprocedure);
  d := replace(d, 'perform public.k1_send(r.organization_id, ''whatsapp''', 'perform public.k1_send(public.k1_chat_alert_org(r.organization_id, other, ''whatsapp''), ''whatsapp''');
  d := replace(d, 'insert into public.k1_deferred_whatsapp (organization_id, user_id, phone, full_name, body, ref_table, ref) values (r.organization_id,', 'insert into public.k1_deferred_whatsapp (organization_id, user_id, phone, full_name, body, ref_table, ref) values (public.k1_chat_alert_org(r.organization_id, other, ''whatsapp''),');
  d := replace(d, 'perform public.k1_send(r.organization_id, ''email''', 'perform public.k1_send(public.k1_chat_alert_org(r.organization_id, other, ''email''), ''email''');
  if position('k1_chat_alert_org' in d) = 0 then raise exception 'patch failed'; end if;
  execute d;
end $$;
