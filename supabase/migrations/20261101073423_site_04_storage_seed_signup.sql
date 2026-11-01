-- Storage buckets for the website (separate from the shok patra 'letters' bucket)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('media','media',true),
  ('documents','documents',false),
  ('receipts','receipts',false),
  ('volunteer-photos','volunteer-photos',false),
  ('blood-requisitions','blood-requisitions',false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "site media read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "site media insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND private.can_manage_content());
CREATE POLICY "site media update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND private.can_manage_content()) WITH CHECK (bucket_id = 'media' AND private.can_manage_content());
CREATE POLICY "site media delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND private.can_manage_content());
CREATE POLICY "site documents submit" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "site documents staff read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND private.is_staff());
CREATE POLICY "site documents staff delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND private.is_admin());

-- Website profile + first super admin on signup (shok patra keeps its own public.handle_new_user)
CREATE OR REPLACE FUNCTION private.handle_new_site_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  INSERT INTO public.site_profiles (id, full_name, email, mobile)
  VALUES (NEW.id, NULLIF(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NULLIF(NEW.phone,''))
  ON CONFLICT (id) DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'SUPER_ADMIN') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'SUPER_ADMIN') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.handle_new_site_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_site AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_site_user();

-- Starter settings (real content is added from the admin panel)
INSERT INTO public.organization_settings (organization_name, tagline, email, state, website, donation_text, about_short, footer_text)
VALUES (
  'Ekatm Kalar Yuva Manch',
  'Youth united for community service',
  'info@ekym.org',
  'Chhattisgarh',
  'https://ekym.org',
  'Every contribution, however small, becomes someone''s meal, medicine or education. Support our seva today.',
  'Ekatm Kalar Yuva Manch is a youth-led community organisation working for service, education, health and social welfare.',
  'Ekatm Kalar Yuva Manch — serving with dignity, every day.'
);

INSERT INTO public.homepage_sections (section_key, title, subtitle, display_order, active) VALUES
  ('announcement','Announcement Bar',NULL,1,true),
  ('hero','Main Hero Slider',NULL,2,true),
  ('festival','Festival Wishes',NULL,3,true),
  ('seva','Seva Prakalp','Our seva projects across health, education, food and community',4,true),
  ('today_activities','Today''s Service Activities','What our teams did recently',5,true),
  ('blood','Blood Requirement','Urgent requirements verified by our blood seva team',6,true),
  ('bhojan','Bhojan Sewa','Warm meals served with dignity',7,true),
  ('contributors','Our Contributors','Gratitude to those who made our seva possible',8,true),
  ('blogs','Blogs','Stories from the field',9,true),
  ('news','In the News',NULL,10,true),
  ('videos','Videos',NULL,11,true),
  ('reels','Reels',NULL,12,true),
  ('campaigns','Campaigns','Support an active campaign',13,true),
  ('testimonials','Voices','What people say about our work',14,true),
  ('donate','Donate','Your support keeps the seva running',15,true),
  ('volunteer','Volunteer','Give your time, skills and heart',16,true),
  ('contact','Contact','We would love to hear from you',17,true);

INSERT INTO public.homepage_slides (title, subtitle, description, image, button_text, button_url, display_order, active) VALUES
 ('Youth united for community service','Ekatm Kalar Yuva Manch','Seva, education, health and social welfare — together, for our community.','/images/hero-seva.jpg','Explore our seva','/seva',1,true),
 ('Donate blood. Save a life.','A verified donor network for urgent needs','Register as a donor and we will reach out only when someone genuinely needs your blood group.','/images/hero-blood.jpg','Register as donor','/blood',2,true),
 ('Give a child a library','Free books, free study space','Your donated books become somebody''s first library card.','/images/hero-library.jpg','Donate books','/library',3,true);

INSERT INTO public.festival_slides (festival_name, title, message, festival_date, display_order, active) VALUES
 ('Republic Day','Happy Republic Day','Saluting the spirit of our Constitution — equality, dignity and service for all.','2027-01-26',1,true),
 ('Independence Day','Happy Independence Day','Freedom is best celebrated in service of others. Jai Hind!','2027-08-15',2,true);

INSERT INTO public.book_categories (name, slug, description, display_order) VALUES
 ('Competitive Exams','competitive-exams','UPSC, CGPSC, SSC, banking and railway preparation',1),
 ('School Textbooks','school-textbooks','Class 1 to 12 textbooks and guides',2),
 ('Engineering & Technical','engineering-technical','Diploma, engineering and technical references',3),
 ('Medical & Nursing','medical-nursing','Medical, nursing and paramedical books',4),
 ('Literature & Fiction','literature-fiction','Hindi, Chhattisgarhi and English literature',5),
 ('Biography & History','biography-history','Biographies, history and social studies',6),
 ('Children','children','Picture books and early readers',7),
 ('General Knowledge','general-knowledge','GK, current affairs and magazines',8);;
