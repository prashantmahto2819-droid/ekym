-- स्लाइड 6: इतिहास, शोध व शिक्षा (मालिक का दिया पाठ)
do $$
declare org uuid;
begin
  select id into org from core.organizations where slug = 'kalchuri-one';
  if org is null or exists (select 1 from public.homepage_slides where image = '/slides/k1-6.jpg') then return; end if;
  insert into public.homepage_slides (organization_id, layout, display_order, active, image,
    subtitle, subtitle_hi, title, title_hi, description, description_hi, features, features_hi,
    button_text, button_text_hi, button_url, button2_text, button2_text_hi, button2_url) values
  (org, 'split', 6, true, '/slides/k1-6.jpg',
   'Preserving our past. Empowering our future.', 'अतीत को सहेजें। भविष्य को सशक्त करें।',
   'Our Heritage. Our Knowledge. Our Future.', 'हमारी विरासत। हमारा ज्ञान। हमारा भविष्य।',
   'Discover Kalchuri history, preserve our heritage, explore research opportunities and empower the next generation through knowledge, education and innovation.',
   'कलचुरी इतिहास जानिए, अपनी विरासत सहेजिए, शोध के अवसर खोजिए और ज्ञान, शिक्षा व नवाचार से नई पीढ़ी को सशक्त बनाइए।',
   E'History & heritage\nResearch & publications\nInternship & learning\nExaminations & assessments\nDigital library & magazine\nGenealogy & historical records',
   E'इतिहास व विरासत\nशोध व प्रकाशन\nइंटर्नशिप व सीखना\nपरीक्षा व मूल्यांकन\nडिजिटल पुस्तकालय व पत्रिका\nवंशावली व ऐतिहासिक अभिलेख',
   'Explore Research', 'शोध व इतिहास देखें', '/library', 'Read the Magazine', 'पत्रिका पढ़ें', '/magazine');
end $$;
