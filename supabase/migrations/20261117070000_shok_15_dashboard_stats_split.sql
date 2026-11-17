-- शोकपत्र डैशबोर्ड: "मंज़ूरी बाकी" अलग-अलग गिनती (यूज़र सिर्फ़ वे जिन्होंने अपनी जानकारी पूरी भरी; अधूरे अलग),
-- परिवार, नाम सुझाव, वंश जोड़ने के अनुरोध, "यही व्यक्ति है", मूल ग्राम अनुरोध, पत्र मंज़ूरी।
-- यह ऐप प्रगतिशील समाज का है, इसलिए एडमिन की गिनती उसी संस्था के परिवारों / पत्रों की (वंश वृक्ष, संपर्क सूची नहीं)।
create or replace function public.dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = 'public' as $function$
declare r jsonb; uid uuid := auth.uid(); home uuid := public.shok_home_org();
begin
  if not public.is_approved() then return '{}'::jsonb; end if;
  if public.is_admin() then
    select jsonb_build_object(
      'is_admin', true,
      'pending_users', (select count(*) from profiles where status = 'pending' and details_done_at is not null),
      'incomplete_users', (select count(*) from profiles where status = 'pending' and details_done_at is null),
      'approved_users', (select count(*) from profiles where status = 'approved'),
      'pending_families', (select count(*) from families f where f.status = 'pending' and f.kind = 'tree' and public.shok_org_in(f.organization_id, home)),
      'pending_suggestions', (select count(*) from member_suggestions s join families f on f.id = s.family_id where s.status = 'pending' and public.shok_org_in(f.organization_id, home)),
      'pending_links', (select count(*) from family_links l join families f on f.id = l.child_family_id where l.status = 'pending' and public.shok_org_in(f.organization_id, home)),
      'pending_same', (select count(*) from same_person_requests where status = 'pending'),
      'pending_origin', case when (select super_admin from profiles where id = uid) then (select count(*) from origin_requests where status = 'pending') else 0 end,
      'pending_letters', (select count(*) from letters l where l.status = 'pending_approval' and public.shok_org_in(l.organization_id, home)),
      'approved_families', (select count(*) from families f where f.status = 'approved' and f.kind = 'tree' and public.shok_org_in(f.organization_id, home)),
      'members', (select count(*) from members m join families f on f.id = m.family_id where f.status = 'approved' and f.kind = 'tree' and public.shok_org_in(f.organization_id, home)),
      'contacts', (select count(*) from families f where f.status = 'approved' and f.kind = 'contact' and public.shok_org_in(f.organization_id, home)),
      'villages', (select count(*) from villages),
      'letters', (select count(*) from letters l where public.shok_org_in(l.organization_id, home)),
      'sent', (select count(*) from letter_recipients lr join letters l on l.id = lr.letter_id where lr.status = 'sent' and public.shok_org_in(l.organization_id, home)),
      'failed', (select count(*) from letter_recipients lr join letters l on l.id = lr.letter_id where lr.status = 'failed' and public.shok_org_in(l.organization_id, home)),
      'queued', (select count(*) from letter_recipients lr join letters l on l.id = lr.letter_id where lr.status in ('queued', 'sending') and public.shok_org_in(l.organization_id, home)),
      'trashed_families', (select count(*) from families f where f.status = 'deleted' and public.shok_org_in(f.organization_id, home))
    ) into r;
  else
    select jsonb_build_object(
      'is_admin', false,
      'my_families', (select count(*) from families where owner_id = uid and status <> 'deleted' and kind = 'tree'),
      'my_pending', (select count(*) from families where owner_id = uid and status = 'pending'),
      'my_approved', (select count(*) from families where owner_id = uid and status = 'approved'),
      'my_members', (select count(*) from members m join families f on f.id = m.family_id where f.owner_id = uid and f.status <> 'deleted'),
      'directory_members', (select count(*) from members m join families f on f.id = m.family_id where f.status = 'approved' and f.kind = 'tree' and public.shok_org_in(f.organization_id, home)),
      'villages', (select count(*) from villages),
      'letters', (select count(*) from letters where created_by = uid),
      'sent', (select count(*) from letter_recipients lr join letters l on l.id = lr.letter_id where l.created_by = uid and lr.status = 'sent')
    ) into r;
  end if;
  return r;
end; $function$;
