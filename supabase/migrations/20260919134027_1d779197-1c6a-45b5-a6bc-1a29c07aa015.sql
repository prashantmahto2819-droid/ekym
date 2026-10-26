-- ===== STORAGE POLICIES =====
CREATE POLICY "media read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND private.can_manage_content());
CREATE POLICY "media update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND private.can_manage_content()) WITH CHECK (bucket_id = 'media' AND private.can_manage_content());
CREATE POLICY "media delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND private.can_manage_content());

CREATE POLICY "documents submit" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "documents staff read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND private.is_staff());
CREATE POLICY "documents staff delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND private.is_admin());

-- ===== ORGANIZATION SETTINGS =====
INSERT INTO public.organization_settings (
  organization_name, tagline, email, phone, whatsapp, address, state, district, city, pincode,
  website, instagram, facebook, youtube, linkedin, x, telegram, donation_text, about_short, footer_text
) VALUES (
  'Ekatm Kalar Yuva Manch',
  'Youth united for community service',
  'info@ekym.org',
  '+91 00000 00000',
  '+91 00000 00000',
  'Ekatm Kalar Yuva Manch, Main Road',
  'Maharashtra', 'Nagpur', 'Nagpur', '440001',
  'https://ekym.org',
  'https://instagram.com/', 'https://facebook.com/', 'https://youtube.com/',
  'https://linkedin.com/', 'https://x.com/', 'https://t.me/',
  'Every contribution, however small, becomes someone''s meal, medicine or education. Support our seva today.',
  'Ekatm Kalar Yuva Manch is a people-powered organisation running Seva Prakalp across health, education, food and community welfare — every single day, with volunteers from the communities we serve.',
  'Ekatm Kalar Yuva Manch — serving with dignity, every day.'
);

-- ===== HOMEPAGE SECTIONS =====
INSERT INTO public.homepage_sections (section_key, title, subtitle, display_order, active) VALUES
  ('announcement','Announcement Bar',NULL,1,true),
  ('hero','Main Hero Slider',NULL,2,true),
  ('festival','Festival Wishes',NULL,3,true),
  ('seva','Seva Prakalp','Our daily seva projects across health, education, food and community',4,true),
  ('today_activities','Today''s Service Activities','What our teams did in the last 24 hours',5,true),
  ('blood','Blood Requirement','Urgent requirements verified by our blood seva team',6,true),
  ('bhojan','Bhojan Sewa','Warm meals served with dignity, every single day',7,true),
  ('contributors','Today''s Contributors','Gratitude to those who made today''s seva possible',8,true),
  ('blogs','Daily Blogs','Stories from the field',9,true),
  ('news','In the News',NULL,10,true),
  ('videos','Videos',NULL,11,true),
  ('reels','Reels',NULL,12,true),
  ('campaigns','Campaigns','Support an active campaign',13,true),
  ('testimonials','Voices','What people say about our work',14,true),
  ('donate','Donate','Your support keeps the seva running',15,true),
  ('volunteer','Volunteer','Give your time, skills and heart',16,true),
  ('contact','Contact','We would love to hear from you',17,true);

-- ===== 21 SEVA PRAKALP =====
INSERT INTO public.seva_projects (name, slug, short_description, description, icon, location, state, city, display_order, active, seo_title, seo_description) VALUES
 ('Bhojan Seva','bhojan-seva','Freshly cooked meals served daily to patients, attendants and families in need.','Bhojan Seva is our daily food service. Teams cook and pack fresh meals every morning and serve them at hospitals, shelters and low-income neighbourhoods. Nobody is asked for identity or documents — only served with dignity.','UtensilsCrossed','Nagpur','Maharashtra','Nagpur',1,true,'Bhojan Seva — Daily Meal Service','Freshly cooked meals served every day to patients, attendants and families in need.'),
 ('Blood Donation Seva','blood-donation-seva','A verified donor network responding to urgent blood and platelet requirements.','Our blood seva team maintains a verified donor network and coordinates with hospitals and blood banks to match urgent requirements for whole blood, RDP, SDP and plasma — including rare groups.','Droplet','Nagpur','Maharashtra','Nagpur',2,true,'Blood Donation Seva','A verified blood donor network responding to urgent requirements.'),
 ('Library & Education Seva','library-education-seva','A free community library and study space for students who need one.','Our library offers free access to academic, competitive exam and general reading books, along with a quiet study space, mentoring and donated study material.','BookOpen','Nagpur','Maharashtra','Nagpur',3,true,'Library & Education Seva','A free community library and study space for students.'),
 ('Medical Help Seva','medical-help-seva','Medicines, tests and treatment support for families who cannot afford them.','We help patients navigate hospitals, arrange medicines and diagnostic tests, and connect families with government schemes and donors for treatment support.','Stethoscope','Nagpur','Maharashtra','Nagpur',4,true,'Medical Help Seva','Medicine, test and treatment support for families in need.'),
 ('Ambulance Seva','ambulance-seva','Emergency transport support for patients and families.','Ambulance Seva provides emergency and non-emergency patient transport with trained attendants, prioritising those who cannot afford private services.','Ambulance','Nagpur','Maharashtra','Nagpur',5,true,'Ambulance Seva','Emergency patient transport support.'),
 ('Vastra Seva','vastra-seva','Clean, dignified clothing distributed to families and shelters.','Donated clothes are sorted, cleaned and distributed through dignity stores and shelter drives so families can choose what they need instead of receiving handouts.','Shirt','Nagpur','Maharashtra','Nagpur',6,true,'Vastra Seva — Clothing Distribution','Clean, dignified clothing for families and shelters.'),
 ('Ration Kit Seva','ration-kit-seva','Monthly ration kits for widows, elderly and daily-wage families.','Each kit contains rice, wheat, pulses, oil, spices and hygiene essentials — enough to support a small family for a month.','ShoppingBasket','Nagpur','Maharashtra','Nagpur',7,true,'Ration Kit Seva','Monthly ration kits for families in need.'),
 ('Beti Shiksha Seva','beti-shiksha-seva','Education support for girl students — fees, books and mentoring.','We sponsor school and college fees, books, uniforms and travel for girl students at risk of dropping out, and pair them with mentors.','GraduationCap','Nagpur','Maharashtra','Nagpur',8,true,'Beti Shiksha Seva','Education support for girl students.'),
 ('Skill Development Seva','skill-development-seva','Free short courses that lead to real work.','Tailoring, computer basics, spoken English, beautician and electrician courses run in short batches with placement support.','Wrench','Nagpur','Maharashtra','Nagpur',9,true,'Skill Development Seva','Free vocational training with placement support.'),
 ('Vriksha Seva','vriksha-seva','Tree plantation and long-term care of every sapling planted.','We plant native saplings with local volunteers and, more importantly, water and protect them for three years so they survive.','Trees','Nagpur','Maharashtra','Nagpur',10,true,'Vriksha Seva — Tree Plantation','Tree plantation with three-year sapling care.'),
 ('Jal Seva','jal-seva','Drinking water points and summer water relief.','Water coolers, earthen pots and refill points at bus stands, hospitals and markets, plus tanker support in scarcity-hit areas.','Droplets','Nagpur','Maharashtra','Nagpur',11,true,'Jal Seva — Drinking Water','Drinking water points and summer water relief.'),
 ('Gau Seva','gau-seva','Care, fodder and treatment for stray and abandoned cattle.','Daily fodder rounds, injury treatment and rescue support for stray cattle, with a shelter network for abandoned animals.','Beef','Nagpur','Maharashtra','Nagpur',12,true,'Gau Seva — Cattle Care','Fodder, treatment and rescue for stray cattle.'),
 ('Vridha Seva','vridha-seva','Companionship, medicine and essentials for elderly living alone.','Volunteers visit elderly citizens living alone, help with medicines, documents and groceries, and simply sit and talk.','HeartHandshake','Nagpur','Maharashtra','Nagpur',13,true,'Vridha Seva — Elderly Support','Support and companionship for elderly living alone.'),
 ('Divyang Seva','divyang-seva','Aids, appliances and access support for persons with disabilities.','Wheelchairs, crutches, hearing aids and prosthetics support, along with help in accessing disability certificates and schemes.','Accessibility','Nagpur','Maharashtra','Nagpur',14,true,'Divyang Seva','Aids, appliances and access support for persons with disabilities.'),
 ('Nari Shakti Seva','nari-shakti-seva','Livelihood and self-help group support for women.','Self-help groups, micro-enterprise training, legal awareness and market linkage support for women from low-income households.','Users','Nagpur','Maharashtra','Nagpur',15,true,'Nari Shakti Seva','Livelihood and self-help support for women.'),
 ('Khel Seva','khel-seva','Sports kits, coaching and ground access for young athletes.','Kits, coaching and tournament support for talented children who cannot afford sports training.','Trophy','Nagpur','Maharashtra','Nagpur',16,true,'Khel Seva — Sports Promotion','Sports kits and coaching for young athletes.'),
 ('Swachhata Seva','swachhata-seva','Community cleanliness drives and waste awareness.','Weekend cleanliness drives at public spaces, water bodies and religious places, with segregation awareness sessions.','Recycle','Nagpur','Maharashtra','Nagpur',17,true,'Swachhata Seva — Cleanliness Drives','Community cleanliness drives and waste awareness.'),
 ('Aapda Seva','aapda-seva','Rapid relief during floods, fire and other disasters.','A trained rapid response team distributes food, water, tarpaulin, medicines and hygiene kits within hours of a disaster.','ShieldAlert','Nagpur','Maharashtra','Nagpur',18,true,'Aapda Seva — Disaster Relief','Rapid relief response during disasters.'),
 ('Anath Seva','anath-seva','Education, nutrition and guardianship support for orphaned children.','Long-term support for orphaned and abandoned children — schooling, nutrition, health checks and mentoring until they are self-reliant.','Baby','Nagpur','Maharashtra','Nagpur',19,true,'Anath Seva — Orphan Support','Education and nutrition support for orphaned children.'),
 ('Nishulk Coaching Seva','nishulk-coaching-seva','Free coaching for school and competitive examinations.','Evening and weekend classes run by volunteer teachers for Class 8-12 students and competitive exam aspirants.','PencilRuler','Nagpur','Maharashtra','Nagpur',20,true,'Nishulk Coaching Seva','Free coaching for school and competitive exams.'),
 ('Arogya Shibir Seva','arogya-shibir-seva','Free health check-up camps in villages and bastis.','Monthly camps with doctors for general, eye, dental, diabetes and blood pressure screening, plus free medicines and referrals.','HeartPulse','Nagpur','Maharashtra','Nagpur',21,true,'Arogya Shibir Seva — Health Camps','Free health check-up camps in villages and bastis.');

-- ===== HERO SLIDES =====
INSERT INTO public.homepage_slides (title, subtitle, description, image, button_text, button_url, display_order, active) VALUES
 ('Youth united for community service','Seva Prakalp, every single day','From meals and medicines to books and blood — our volunteers show up every morning, in every season.','/images/hero-seva.jpg','Explore our seva','/seva',1,true),
 ('Donate blood. Save a life.','A verified donor network for urgent needs','Register as a donor in two minutes and we will reach out only when someone genuinely needs your blood group.','/images/hero-blood.jpg','Register as donor','/blood',2,true),
 ('Give a child a library','Free books, free study space','Your donated books become somebody''s first library card. Support education seva today.','/images/hero-library.jpg','Donate books','/library',3,true);

-- ===== FESTIVAL SLIDES =====
INSERT INTO public.festival_slides (festival_name, title, message, festival_date, display_order, active) VALUES
 ('Republic Day','Happy Republic Day','Saluting the spirit of our Constitution — equality, dignity and service for all.','2027-01-26',1,true),
 ('Independence Day','Happy Independence Day','Freedom is best celebrated in service of others. Jai Hind!','2027-08-15',2,true);

-- ===== BOOK CATEGORIES =====
INSERT INTO public.book_categories (name, slug, description, display_order) VALUES
 ('Competitive Exams','competitive-exams','UPSC, MPSC, SSC, banking and railway preparation',1),
 ('School Textbooks','school-textbooks','Class 1 to 12 textbooks and guides',2),
 ('Engineering & Technical','engineering-technical','Diploma, engineering and technical references',3),
 ('Medical & Nursing','medical-nursing','Medical, nursing and paramedical books',4),
 ('Literature & Fiction','literature-fiction','Marathi, Hindi and English literature',5),
 ('Biography & History','biography-history','Biographies, history and social studies',6),
 ('Children','children','Picture books and early readers',7),
 ('General Knowledge','general-knowledge','GK, current affairs and magazines',8);

-- ===== INTERNSHIP PROGRAMS =====
INSERT INTO public.internship_programs (name, slug, department, description, duration, eligibility, seats, fee, active, display_order) VALUES
 ('Social Work Internship','social-work-internship','Field Operations','Work alongside our seva teams on food, health and education programmes. Includes field visits, documentation and community interaction.','1-3 months','Students of MSW, BSW, Sociology or any graduate with genuine interest',20,0,true,1),
 ('Content & Communication Internship','content-communication-internship','Communications','Write field stories, capture photographs and help run our social media and blog desk.','1-2 months','Students of Journalism, Mass Communication or strong writers from any stream',10,0,true,2);

-- ===== TESTIMONIALS =====
INSERT INTO public.testimonials (name, city, role, message, approved, active, display_order) VALUES
 ('Sunita Deshmukh','Nagpur','Beneficiary family','When my husband was admitted, the foundation''s team brought us food every single day for three weeks and never once asked for anything.',true,true,1),
 ('Dr. Arvind Kale','Nagpur','Volunteer doctor','I have worked with many groups, but the health camps here are organised with real discipline. Medicines reach the right people.',true,true,2),
 ('Rohit Meshram','Nagpur','Blood donor','They called me only once, at 2 am, when a child actually needed my blood group. That respect for a donor''s time matters.',true,true,3);

-- ===== BLOGS =====
INSERT INTO public.blogs (title, slug, excerpt, content, status, published_at, state, city, seo_title, seo_description, og_title, og_description) VALUES
 ('400 meals, one kitchen, every morning','400-meals-one-kitchen-every-morning','How our Bhojan Seva kitchen plans, cooks and delivers hot meals before 11 am each day.','Our kitchen team arrives at 5:30 am. By 7 am the rice is on, by 9:30 am packing begins, and by 11 am the first van reaches the hospital gate.\n\nThe discipline matters more than the scale. Meals are counted, packed and logged so nothing is wasted and no one is turned away. Volunteers rotate on a weekly roster, and every batch is tasted before it leaves the kitchen.\n\nIf you would like to sponsor a day of Bhojan Seva, or cook with us on a weekend, reach out through our contact page.','published', now() - interval '1 day','Maharashtra','Nagpur','400 meals, one kitchen, every morning','How our Bhojan Seva kitchen plans and delivers hot meals every day.','400 meals, one kitchen, every morning','Inside the daily discipline of our Bhojan Seva kitchen.'),
 ('What a good blood donor network actually looks like','what-a-good-blood-donor-network-looks-like','Verification, respect for donors'' time, and never sharing personal data — the three rules we follow.','A donor list is easy to build and easy to ruin. Ours works because of three rules.\n\nFirst, every requirement is verified with the hospital before it is published. Second, donors are contacted only for their own blood group and only when the need is real. Third, no donor''s personal details are ever shown publicly or shared with third parties.\n\nRegister once, and we will respect your time and your privacy.','published', now() - interval '3 days','Maharashtra','Nagpur','What a good blood donor network looks like','Verification, donor respect and privacy — how our blood seva network works.','What a good blood donor network looks like','The three rules behind our blood donor network.'),
 ('The library that started with 60 donated books','library-started-with-60-donated-books','A quiet reading room, a shelf of donated books, and the students who made it theirs.','It began with sixty books in a borrowed room. Today the shelves hold competitive exam guides, school textbooks and a growing children''s corner.\n\nThe students run it themselves — a rotating roster keeps the register, arranges the shelves and helps newcomers find what they need.\n\nDonate books you no longer read. They will be catalogued, labelled and put in somebody''s hands within a week.','published', now() - interval '6 days','Maharashtra','Nagpur','The library that started with 60 donated books','How a borrowed room and 60 donated books became a community library.','The library that started with 60 donated books','How a borrowed room became a community library.');

-- ===== NEWS =====
INSERT INTO public.news (title, slug, description, source_name, published_at, status, display_homepage, seo_title, seo_description) VALUES
 ('Foundation completes 1,000 days of uninterrupted Bhojan Seva','1000-days-of-bhojan-seva','Volunteers marked 1,000 continuous days of the daily meal service with a community lunch at the hospital campus.','Ekatm Kalar Yuva Manch', now() - interval '2 days','published',true,'1,000 days of uninterrupted Bhojan Seva','Volunteers marked 1,000 continuous days of daily meal service.'),
 ('Health camp screens 480 residents in a single day','health-camp-screens-480-residents','A monthly Arogya Shibir camp offered general, eye and diabetes screening with free medicines.','Ekatm Kalar Yuva Manch', now() - interval '9 days','published',true,'Health camp screens 480 residents','A monthly health camp offered screening and free medicines to 480 residents.'),
 ('Book donation drive collects 2,300 books for the community library','book-drive-collects-2300-books','Schools, families and two bookstores contributed to the largest book collection drive so far.','Ekatm Kalar Yuva Manch', now() - interval '20 days','published',true,'Book drive collects 2,300 books','The largest book donation drive so far for the community library.');

-- ===== CAMPAIGNS =====
INSERT INTO public.campaigns (title, slug, description, target_amount, start_date, end_date, status, location, beneficiary, seo_title, seo_description) VALUES
 ('Sponsor a month of Bhojan Seva','sponsor-a-month-of-bhojan-seva','One month of hot meals for patients and attendants at the government hospital — approximately 12,000 meals.',350000,CURRENT_DATE - 20, CURRENT_DATE + 70,'published','Nagpur, Maharashtra','Patients and attendants at the government hospital','Sponsor a month of Bhojan Seva','Fund a month of hot meals for hospital patients and attendants.'),
 ('Books and shelves for the community library','books-and-shelves-for-the-library','Help us add 2,000 new titles, six steel shelves and study lighting to the free community library.',180000,CURRENT_DATE - 5, CURRENT_DATE + 85,'published','Nagpur, Maharashtra','Students using the free community library','Books and shelves for the community library','Help add new titles, shelves and lighting to the free library.');

-- ===== GALLERY =====
WITH g AS (
  INSERT INTO public.galleries (title, slug, description, category, event_date, location, active, display_order)
  VALUES ('Bhojan Seva — daily kitchen','bhojan-seva-daily-kitchen','Photographs from a regular morning at our meal service kitchen.','Bhojan Seva', CURRENT_DATE - 4,'Nagpur, Maharashtra',true,1)
  RETURNING id
)
INSERT INTO public.gallery_items (gallery_id, image, caption, display_order)
SELECT g.id, v.image, v.caption, v.ord FROM g, (VALUES
  ('/images/gallery-kitchen-1.jpg','Morning preparation begins at 5:30 am',1),
  ('/images/gallery-kitchen-2.jpg','Packing meals for the hospital round',2),
  ('/images/gallery-kitchen-3.jpg','The first van leaves before 11 am',3)
) AS v(image, caption, ord);