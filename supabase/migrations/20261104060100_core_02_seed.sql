-- Kalchuri One · Phase 1 · seed: permissions, system role templates, first organizations, mapping of existing admins.

insert into core.permissions(key, module, label, label_hi) values
  ('org.settings.edit','org','Edit organization settings','संगठन की सेटिंग बदलना'),
  ('org.roles.manage','org','Manage team roles','टीम के रोल संभालना'),
  ('org.children.manage','org','Manage sub-organizations','उप-संगठन संभालना'),
  ('org.oversee','org','View shared sub-organization data','उप-संगठनों का साझा डेटा देखना'),
  ('org.member.approve','org','Approve memberships','सदस्यता स्वीकृत करना'),
  ('org.member.card.issue','org','Issue membership cards','सदस्यता कार्ड जारी करना'),
  ('gov.meeting.manage','gov','Manage meetings and minutes','बैठक और कार्यवृत्त संभालना'),
  ('gov.resolution.record','gov','Record resolutions','प्रस्ताव दर्ज करना'),
  ('gov.election.manage','gov','Manage elections and polls','चुनाव/मतदान संभालना'),
  ('cms.page.edit','cms','Edit website pages','वेबसाइट पेज बदलना'),
  ('cms.post.create','cms','Write posts','लेख लिखना'),
  ('cms.post.review','cms','Review posts','लेख की समीक्षा'),
  ('cms.post.publish','cms','Publish posts','लेख प्रकाशित करना'),
  ('cms.post.nominate_central','cms','Nominate posts to the central feed','लेख को केंद्रीय फ़ीड हेतु भेजना'),
  ('cms.media.manage','cms','Manage media library','मीडिया लाइब्रेरी संभालना'),
  ('cms.gallery.manage','cms','Manage galleries and videos','गैलरी और वीडियो संभालना'),
  ('cms.settings.edit','cms','Edit website settings and homepage','वेबसाइट सेटिंग और होमपेज बदलना'),
  ('pub.issue.publish','pub','Publish magazine issues','पत्रिका अंक प्रकाशित करना'),
  ('docs.template.edit','docs','Edit design templates','डिज़ाइन टेम्पलेट बदलना'),
  ('docs.letter.create','docs','Create letters and documents','पत्र/दस्तावेज़ बनाना'),
  ('docs.letter.approve','docs','Approve letters and documents','पत्र/दस्तावेज़ स्वीकृत करना'),
  ('docs.letter.dispatch','docs','Dispatch letters','पत्र भेजना'),
  ('fin.voucher.create','fin','Create vouchers and receipts','वाउचर/रसीद बनाना'),
  ('fin.voucher.approve','fin','Approve vouchers','वाउचर स्वीकृत करना'),
  ('fin.voucher.cancel','fin','Cancel vouchers and receipts','वाउचर/रसीद रद्द करना'),
  ('fin.report.view','fin','View financial reports','वित्तीय रिपोर्ट देखना'),
  ('fin.fy.lock','fin','Lock financial years','वित्तीय वर्ष बंद करना'),
  ('events.manage','events','Manage events and invitations','आयोजन और निमंत्रण संभालना'),
  ('comms.campaign.send','comms','Send WhatsApp/email campaigns','WhatsApp/ईमेल अभियान भेजना'),
  ('comms.channel.manage','comms','Manage messaging channels','संदेश चैनल संभालना'),
  ('family.manage','family','Manage family trees','वंश वृक्ष संभालना'),
  ('shok.send','shok','Send condolence messages','शोक संदेश भेजना'),
  ('shok.approve','shok','Approve condolence messages','शोक संदेश स्वीकृत करना'),
  ('community.blood.manage','community','Manage blood donors and requests','रक्तदाता और रक्त अनुरोध संभालना'),
  ('community.library.manage','community','Manage library','लाइब्रेरी संभालना'),
  ('community.volunteer.manage','community','Manage volunteers','स्वयंसेवक संभालना'),
  ('community.internship.manage','community','Manage internships','इंटर्नशिप संभालना'),
  ('community.donation.view','community','View donations','दान देखना'),
  ('community.messages.manage','community','Manage contact messages','संपर्क संदेश संभालना'),
  ('ads.manage','ads','Manage advertisements','विज्ञापन संभालना'),
  ('audit.view','audit','View audit log','ऑडिट लॉग देखना');

insert into core.roles(organization_id, key, name, name_hi, permissions, is_system) values
  (null,'org_admin','Organization Admin','संगठन एडमिन', array['*'], true),
  (null,'president','President','अध्यक्ष', array['org.*','gov.*','docs.*','cms.post.publish','fin.report.view','fin.voucher.approve','events.*','comms.campaign.send','audit.view'], true),
  (null,'secretary','Secretary','सचिव', array['org.member.approve','org.member.card.issue','gov.*','docs.letter.create','docs.letter.dispatch','events.*','comms.campaign.send','cms.post.create','community.messages.manage'], true),
  (null,'treasurer','Treasurer','कोषाध्यक्ष', array['fin.*','community.donation.view','docs.letter.create'], true),
  (null,'editor','Editor','संपादक', array['cms.*','pub.*'], true),
  (null,'author','Author','लेखक', array['cms.post.create'], true),
  (null,'media_incharge','Media In-charge','मीडिया प्रभारी', array['cms.post.create','cms.media.manage','cms.gallery.manage'], true),
  (null,'family_admin','Family Tree Admin','वंश वृक्ष एडमिन', array['family.manage','shok.send','shok.approve'], true),
  (null,'service_manager','Service Manager','सेवा प्रभारी', array['community.*'], true),
  (null,'auditor','Auditor','ऑडिटर', array['fin.report.view','audit.view'], true),
  (null,'member','Member','सदस्य', array[]::text[], true);

-- first organizations (names and level can be edited later from the admin panel)
insert into core.organizations(slug, name, name_hi, short_name, kind, level, status)
values ('kalchuri-samaj','Kalchuri Samaj','कलचुरी समाज','Kalchuri Samaj','samaj','national','active');

insert into core.organizations(slug, name, name_hi, short_name, kind, level, parent_id, status, share_with_parent)
select 'ekym','Ekatm Kalar Yuva Manch','एकात्म कलार युवा मंच','EKYM','youth_wing','local', id, 'active', false
  from core.organizations where slug = 'kalchuri-samaj';

-- existing platform owner (shokpatra super admin) → platform admin
insert into core.platform_admins(user_id, level)
select id, 'super' from public.profiles where super_admin
on conflict do nothing;

-- existing website admins (ekym user_roles) → EKYM roles
insert into core.role_assignments(organization_id, user_id, role_id)
select o.id, ur.user_id, r.id
  from public.user_roles ur
  join core.organizations o on o.slug = 'ekym'
  join core.roles r on r.organization_id is null and r.key = case ur.role::text
       when 'SUPER_ADMIN' then 'org_admin' when 'ADMIN' then 'org_admin'
       when 'CONTENT_MANAGER' then 'editor' when 'ACCOUNTANT' then 'treasurer' when 'AUDITOR' then 'auditor'
       when 'BLOOD_MANAGER' then 'service_manager' when 'LIBRARY_MANAGER' then 'service_manager'
       when 'VOLUNTEER_MANAGER' then 'service_manager' when 'INTERNSHIP_MANAGER' then 'service_manager'
       when 'HR_MANAGER' then 'service_manager' else 'member' end
on conflict do nothing;

-- existing shokpatra admins → family tree admins of the root samaj
-- (their village/region scope stays in public.admin_villages / public.admin_regions)
insert into core.role_assignments(organization_id, user_id, role_id)
select o.id, p.id, r.id
  from public.profiles p
  join core.organizations o on o.slug = 'kalchuri-samaj'
  join core.roles r on r.organization_id is null and r.key = 'family_admin'
 where p.role = 'admin' and p.status = 'approved'
on conflict do nothing;
