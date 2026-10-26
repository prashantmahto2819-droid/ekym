-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM (
  'SUPER_ADMIN','ADMIN','CONTENT_MANAGER','STAFF','AUDITOR','USER',
  'BLOOD_MANAGER','LIBRARY_MANAGER','VOLUNTEER_MANAGER','INTERNSHIP_MANAGER',
  'HR_MANAGER','ACCOUNTANT','AMBULANCE_MANAGER','JOB_MANAGER',
  'DONOR','VOLUNTEER','INTERN','STUDENT','JOB_SEEKER','EMPLOYER'
);

CREATE TYPE public.content_status AS ENUM ('draft','review','published','archived');

-- ============ SHARED FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  mobile TEXT,
  whatsapp TEXT,
  photo_url TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  address TEXT,
  pincode TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_mobile ON public.profiles(mobile);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ROLES / USER ROLES ============
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  phase INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ ROLE HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles));
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'SUPER_ADMIN'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_content()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','CONTENT_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','CONTENT_MANAGER','STAFF','AUDITOR',
    'BLOOD_MANAGER','LIBRARY_MANAGER','VOLUNTEER_MANAGER','INTERNSHIP_MANAGER','HR_MANAGER','ACCOUNTANT']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_blood()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','BLOOD_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_library()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','LIBRARY_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_volunteers()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','VOLUNTEER_MANAGER','HR_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION public.can_manage_internships()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','INTERNSHIP_MANAGER','HR_MANAGER']::public.app_role[]);
$$;

-- profile policies
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_staff());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.is_admin()) WITH CHECK (id = auth.uid() OR public.is_admin());

CREATE POLICY "roles readable by signed in" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles managed by super admin" ON public.roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "own roles or admin read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "admin assigns roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.roles (role, label, description, phase) VALUES
  ('SUPER_ADMIN','Super Admin','Complete access to everything',1),
  ('ADMIN','Admin','Manage all modules and content',1),
  ('CONTENT_MANAGER','Content Manager','Manage blogs, news, media, gallery, videos, reels',1),
  ('STAFF','Staff','Operational access',1),
  ('AUDITOR','Auditor','Read-only oversight and audit logs',1),
  ('USER','User','Standard registered user',1),
  ('BLOOD_MANAGER','Blood Manager','Manage blood donors and requirements',2),
  ('LIBRARY_MANAGER','Library Manager','Manage books, students, issue and return',2),
  ('VOLUNTEER_MANAGER','Volunteer Manager','Manage volunteer applications',2),
  ('INTERNSHIP_MANAGER','Internship Manager','Manage internship programs and interns',2),
  ('HR_MANAGER','HR Manager','Manage people and designations',2),
  ('ACCOUNTANT','Accountant','Manage accounts and donations',2),
  ('AMBULANCE_MANAGER','Ambulance Manager','Manage ambulance service',2),
  ('JOB_MANAGER','Job Manager','Manage job board',2),
  ('DONOR','Donor','Donor portal access',2),
  ('VOLUNTEER','Volunteer','Volunteer portal access',2),
  ('INTERN','Intern','Intern portal access',2),
  ('STUDENT','Student','Library student portal access',2),
  ('JOB_SEEKER','Job Seeker','Job seeker portal access',2),
  ('EMPLOYER','Employer','Employer portal access',2);

-- ============ ORGANIZATION SETTINGS ============
CREATE TABLE public.organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL DEFAULT 'Ekatm Kalar Yuva Manch',
  tagline TEXT,
  logo TEXT,
  favicon TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  state TEXT,
  district TEXT,
  city TEXT,
  pincode TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  youtube TEXT,
  linkedin TEXT,
  x TEXT,
  telegram TEXT,
  donation_text TEXT,
  about_short TEXT,
  footer_text TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_org_updated BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.organization_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org settings public read" ON public.organization_settings FOR SELECT USING (true);
CREATE POLICY "org settings admin write" ON public.organization_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ HOMEPAGE SECTIONS ============
CREATE TABLE public.homepage_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE TRIGGER trg_hs_updated BEFORE UPDATE ON public.homepage_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.homepage_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_sections TO authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections public read" ON public.homepage_sections FOR SELECT USING (active = true OR public.is_staff());
CREATE POLICY "sections admin write" ON public.homepage_sections FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============ HOMEPAGE SLIDES ============
CREATE TABLE public.homepage_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image TEXT,
  button_text TEXT,
  button_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_slides_updated BEFORE UPDATE ON public.homepage_slides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.homepage_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_slides TO authenticated;
GRANT ALL ON public.homepage_slides TO service_role;
ALTER TABLE public.homepage_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slides public read" ON public.homepage_slides FOR SELECT USING (
  (active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()))
  OR public.can_manage_content()
);
CREATE POLICY "slides content write" ON public.homepage_slides FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ FESTIVAL SLIDES ============
CREATE TABLE public.festival_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_name TEXT NOT NULL,
  title TEXT,
  message TEXT,
  image TEXT,
  festival_date DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fest_updated BEFORE UPDATE ON public.festival_slides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.festival_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.festival_slides TO authenticated;
GRANT ALL ON public.festival_slides TO service_role;
ALTER TABLE public.festival_slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "festival public read" ON public.festival_slides FOR SELECT USING (active = true OR public.can_manage_content());
CREATE POLICY "festival content write" ON public.festival_slides FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ SEVA PROJECTS ============
CREATE TABLE public.seva_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  featured_image TEXT,
  icon TEXT,
  location TEXT,
  state TEXT,
  city TEXT,
  coordinator TEXT,
  phone TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seva_slug ON public.seva_projects(slug);
CREATE INDEX idx_seva_state_city ON public.seva_projects(state, city);
CREATE TRIGGER trg_seva_updated BEFORE UPDATE ON public.seva_projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.seva_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seva_projects TO authenticated;
GRANT ALL ON public.seva_projects TO service_role;
ALTER TABLE public.seva_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seva public read" ON public.seva_projects FOR SELECT USING (active = true OR public.can_manage_content());
CREATE POLICY "seva content write" ON public.seva_projects FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ CONTRIBUTORS ============
CREATE TABLE public.contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo TEXT,
  organization TEXT,
  contribution_type TEXT,
  description TEXT,
  location TEXT,
  recognition_message TEXT,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_publicly BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  seva_project_id UUID REFERENCES public.seva_projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contrib_date ON public.contributors(contribution_date DESC);
CREATE TRIGGER trg_contrib_updated BEFORE UPDATE ON public.contributors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.contributors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributors TO authenticated;
GRANT ALL ON public.contributors TO service_role;
ALTER TABLE public.contributors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contrib public read" ON public.contributors FOR SELECT USING ((active = true AND display_publicly = true) OR public.can_manage_content());
CREATE POLICY "contrib content write" ON public.contributors FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ BLOGS ============
CREATE TABLE public.blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seva_project_id UUID REFERENCES public.seva_projects(id) ON DELETE SET NULL,
  state TEXT,
  city TEXT,
  published_at TIMESTAMPTZ,
  status public.content_status NOT NULL DEFAULT 'draft',
  video_url TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blogs_slug ON public.blogs(slug);
CREATE INDEX idx_blogs_status ON public.blogs(status);
CREATE INDEX idx_blogs_published ON public.blogs(published_at DESC);
CREATE INDEX idx_blogs_state_city ON public.blogs(state, city);
CREATE TRIGGER trg_blogs_updated BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blogs public read" ON public.blogs FOR SELECT USING (
  (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR public.can_manage_content()
);
CREATE POLICY "blogs content write" ON public.blogs FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ NEWS ============
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  thumbnail TEXT,
  description TEXT,
  source_name TEXT,
  external_url TEXT,
  published_at TIMESTAMPTZ,
  status public.content_status NOT NULL DEFAULT 'draft',
  display_homepage BOOLEAN NOT NULL DEFAULT true,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_news_slug ON public.news(slug);
CREATE INDEX idx_news_published ON public.news(published_at DESC);
CREATE INDEX idx_news_status ON public.news(status);
CREATE TRIGGER trg_news_updated BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news public read" ON public.news FOR SELECT USING (
  (status = 'published' AND (published_at IS NULL OR published_at <= now())) OR public.can_manage_content()
);
CREATE POLICY "news content write" ON public.news FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ VIDEOS / REELS ============
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  thumbnail TEXT,
  platform TEXT NOT NULL DEFAULT 'youtube' CHECK (platform IN ('youtube','vimeo','facebook','instagram','other')),
  video_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_videos_updated BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos public read" ON public.videos FOR SELECT USING (active = true OR public.can_manage_content());
CREATE POLICY "videos content write" ON public.videos FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

CREATE TABLE public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  thumbnail TEXT,
  platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('youtube','vimeo','facebook','instagram','other')),
  video_url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_reels_updated BEFORE UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.reels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reels TO authenticated;
GRANT ALL ON public.reels TO service_role;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels public read" ON public.reels FOR SELECT USING (active = true OR public.can_manage_content());
CREATE POLICY "reels content write" ON public.reels FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ GALLERIES ============
CREATE TABLE public.galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  category TEXT,
  event_date DATE,
  location TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_galleries_slug ON public.galleries(slug);
CREATE TRIGGER trg_gal_updated BEFORE UPDATE ON public.galleries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.galleries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.galleries TO authenticated;
GRANT ALL ON public.galleries TO service_role;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "galleries public read" ON public.galleries FOR SELECT USING (active = true OR public.can_manage_content());
CREATE POLICY "galleries content write" ON public.galleries FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  image TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gallery_items_gallery ON public.gallery_items(gallery_id);
CREATE TRIGGER trg_gitems_updated BEFORE UPDATE ON public.gallery_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.gallery_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT ALL ON public.gallery_items TO service_role;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gallery items public read" ON public.gallery_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = gallery_id AND g.active = true) OR public.can_manage_content()
);
CREATE POLICY "gallery items content write" ON public.gallery_items FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ TESTIMONIALS ============
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  photo TEXT,
  city TEXT,
  role TEXT,
  message TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  approved BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_test_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT USING ((active = true AND approved = true) OR public.can_manage_content());
CREATE POLICY "testimonials content write" ON public.testimonials FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ CONTACT MESSAGES ============
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT,
  email TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  state TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','resolved','closed')),
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_status ON public.contact_messages(status);
CREATE INDEX idx_contact_created ON public.contact_messages(created_at DESC);
CREATE TRIGGER trg_contact_updated BEFORE UPDATE ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can send message" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "staff read messages" ON public.contact_messages FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "staff update messages" ON public.contact_messages FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "admin delete messages" ON public.contact_messages FOR DELETE TO authenticated USING (public.is_admin());

-- ============ CAMPAIGNS ============
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cover_image TEXT,
  description TEXT,
  target_amount NUMERIC(14,2),
  raised_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status public.content_status NOT NULL DEFAULT 'draft',
  location TEXT,
  beneficiary TEXT,
  seo_title TEXT,
  seo_description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaigns_slug ON public.campaigns(slug);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE TRIGGER trg_camp_updated BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns public read" ON public.campaigns FOR SELECT USING (status = 'published' OR public.can_manage_content());
CREATE POLICY "campaigns content write" ON public.campaigns FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ MEDIA LIBRARY ============
CREATE TABLE public.media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  alt_text TEXT,
  caption TEXT,
  bucket TEXT NOT NULL DEFAULT 'media',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_media_created ON public.media_library(created_at DESC);
CREATE TRIGGER trg_media_updated BEFORE UPDATE ON public.media_library FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_library TO authenticated;
GRANT ALL ON public.media_library TO service_role;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media staff read" ON public.media_library FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "media content write" ON public.media_library FOR ALL TO authenticated USING (public.can_manage_content()) WITH CHECK (public.can_manage_content());

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_module ON public.audit_logs(module);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit staff read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "audit insert own" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());