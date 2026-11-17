-- Kalchuri One होम स्लाइडर: नया "split" रूप — बाएँ असली (द्विभाषी) शीर्षक, विवरण, सुविधाएँ, दो बटन; दाएँ चित्र।
-- नए कॉलम (सब वैकल्पिक, पुराने स्लाइड पहले जैसे चलते रहें)।
alter table public.homepage_slides
  add column if not exists layout text,               -- null = पुराना पूरा चित्र; 'split' = बाएँ लेख, दाएँ चित्र
  add column if not exists features text,             -- हर पंक्ति एक सुविधा
  add column if not exists features_hi text,
  add column if not exists button2_text text,
  add column if not exists button2_text_hi text,
  add column if not exists button2_url text;

do $$
declare org uuid;
begin
  select id into org from core.organizations where slug = 'kalchuri-one';
  if org is null then return; end if;
  if exists (select 1 from public.homepage_slides where organization_id = org and image like '/slides/k1-%') then return; end if;

  -- पुराने स्लाइड बंद (मिटाए नहीं)
  update public.homepage_slides set active = false where organization_id = org and active;

  insert into public.homepage_slides (organization_id, layout, display_order, active, image,
    subtitle, subtitle_hi, title, title_hi, description, description_hi, features, features_hi,
    button_text, button_text_hi, button_url, button2_text, button2_text_hi, button2_url) values
  (org, 'split', 1, true, '/slides/k1-1.jpg',
   'A digital platform for the Kalchuri community', 'कलचुरी समाज का डिजिटल मंच',
   'One Community. One Platform.', 'एक समाज। एक मंच।',
   'A complete digital ecosystem to connect, organize, preserve and empower the entire Kalchuri community.',
   'पूरे कलचुरी समाज को जोड़ने, संगठित करने, सहेजने और सशक्त बनाने वाला एक संपूर्ण डिजिटल तंत्र।',
   E'Organization website\nMembership & digital ID\nFamily tree (7–8 generations)\nShokpatra (condolence)\nSocial network\nMatrimony',
   E'संस्था की वेबसाइट\nसदस्यता व डिजिटल पहचान पत्र\nवंश वृक्ष (7–8 पीढ़ी)\nशोक पत्र सेवा\nसामाजिक नेटवर्क\nवैवाहिक सेवा',
   'Explore Platform', 'मंच देखें', '/about', 'Join Community', 'समाज से जुड़ें', '/join'),
  (org, 'split', 2, true, '/slides/k1-2.jpg',
   'Digital solutions for Kalchuri organizations', 'कलचुरी संस्थाओं के लिए डिजिटल समाधान',
   'Your Organization. Your Own Digital Identity.', 'आपकी संस्था। आपकी अपनी डिजिटल पहचान।',
   'Create and manage your organization online with a powerful, easy-to-use platform — free for organizations.',
   'अपनी संस्था को ऑनलाइन बनाइए और चलाइए — सरल और सशक्त मंच, संस्थाओं के लिए निःशुल्क।',
   E'Organization website\nMember management\nDigital membership ID\nEvents & registration\nDocuments & constitution\nPhoto gallery & publications',
   E'संस्था की वेबसाइट\nसदस्य प्रबंधन\nडिजिटल सदस्यता पहचान पत्र\nआयोजन व पंजीकरण\nदस्तावेज़ व संविधान\nफ़ोटो गैलरी व प्रकाशन',
   'Register Your Organization', 'अपनी संस्था जोड़ें', '/register-organization', 'Explore Features', 'सुविधाएँ देखें', '/organizations'),
  (org, 'split', 3, true, '/slides/k1-3.jpg',
   'Family heritage & community care', 'पारिवारिक विरासत व सामाजिक सेवा',
   'Preserve Your Roots. Connect Generations.', 'अपनी जड़ें सहेजें। पीढ़ियों को जोड़ें।',
   'Build your family tree, honour your loved ones, and take part in community service and events.',
   'अपना वंश वृक्ष बनाइए, अपनों को याद रखिए, और समाज सेवा व आयोजनों में भाग लीजिए।',
   E'Family tree (genealogy)\nNative village & family records\nShokpatra seva (condolence)\nBlood donation\nSeva projects & social service\nCommunity events',
   E'वंश वृक्ष\nमूल ग्राम व पारिवारिक अभिलेख\nशोक पत्र सेवा\nरक्तदान\nसेवा प्रकल्प व समाज सेवा\nसामाजिक आयोजन',
   'Explore Family Tree', 'वंश वृक्ष देखें', '/shok', 'Discover Community Services', 'समाज सेवाएँ देखें', '/seva'),
  (org, 'split', 4, true, '/slides/k1-4.jpg',
   'The social network for the Kalchuri community', 'कलचुरी समाज का अपना सामाजिक नेटवर्क',
   'Your Community. Your Social Network.', 'आपका समाज। आपका सामाजिक नेटवर्क।',
   'Connect, share, engage and grow together with the Kalchuri community.',
   'कलचुरी समाज के साथ जुड़िए, साझा कीजिए और साथ मिलकर आगे बढ़िए।',
   E'Posts & updates\nStories & reels\nGroups & members\nBusiness directory\nJobs & opportunities\nMatrimony\nPolls & opinions\nEvents & activities',
   E'पोस्ट व अपडेट\nस्टोरी व रील\nसमूह व सदस्य\nव्यापार निर्देशिका\nनौकरी व अवसर\nवैवाहिक सेवा\nमतदान व राय\nआयोजन व गतिविधियाँ',
   'Explore Community', 'चौपाल देखें', '/community', 'Join Kalchuri One', 'कलचुरी वन से जुड़ें', '/join'),
  (org, 'split', 5, true, '/slides/k1-5.jpg',
   'Knowledge · Research · Education · Innovation', 'ज्ञान · शोध · शिक्षा · नवाचार',
   'Our Heritage. Our Knowledge. Our Future.', 'हमारी विरासत। हमारा ज्ञान। हमारा भविष्य।',
   'Explore the rich history of the Kalchuri dynasty, research your ancestry, find learning opportunities and build a brighter future together.',
   'कलचुरी राजवंश का समृद्ध इतिहास जानिए, अपने पूर्वजों की खोज कीजिए, सीखने के अवसर पाइए और मिलकर उज्ज्वल भविष्य बनाइए।',
   E'History & heritage\nResearch & publications\nInternships & learning\nExaminations & assessments\nGenealogy & records\nMagazine & e-publications\nAchievements & recognition\nYouth & innovation',
   E'इतिहास व विरासत\nशोध व प्रकाशन\nइंटर्नशिप व सीखना\nपरीक्षा व मूल्यांकन\nवंशावली व अभिलेख\nपत्रिका व ई-प्रकाशन\nउपलब्धियाँ व सम्मान\nयुवा व नवाचार',
   'Explore Research', 'शोध देखें', '/library', 'Read & Discover', 'पढ़ें और जानें', '/magazine');
end $$;
