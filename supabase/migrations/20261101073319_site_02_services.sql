CREATE SEQUENCE private.seq_blood_donor START 1;
CREATE SEQUENCE private.seq_blood_req START 1;
CREATE SEQUENCE private.seq_book_don START 1;
CREATE SEQUENCE private.seq_material_don START 1;
CREATE SEQUENCE private.seq_volunteer START 1;
CREATE SEQUENCE private.seq_intern START 1;
CREATE SEQUENCE private.seq_book START 1;
CREATE SEQUENCE private.seq_student START 1;

CREATE OR REPLACE FUNCTION private.make_ref(_prefix text, _seq text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
DECLARE n BIGINT;
BEGIN
  EXECUTE format('SELECT nextval(%L)', _seq) INTO n;
  RETURN 'EKYM-' || _prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
END; $$;
REVOKE ALL ON FUNCTION private.make_ref(text, text) FROM PUBLIC, anon, authenticated;

-- BLOOD DONORS
CREATE TABLE public.blood_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  donor_id TEXT UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male','female','other')),
  date_of_birth DATE, mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT, area TEXT, pincode TEXT,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-','Bombay','Rare/Other')),
  preferred_component TEXT NOT NULL DEFAULT 'Whole Blood' CHECK (preferred_component IN ('Whole Blood','RDP','SDP','Plasma','Other')),
  last_donation_date DATE,
  emergency_available BOOLEAN NOT NULL DEFAULT false,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','active','inactive','blocked')),
  total_donations INTEGER NOT NULL DEFAULT 0,
  eligible_from DATE, medical_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_donors_group ON public.blood_donors(blood_group);
CREATE INDEX idx_donors_loc ON public.blood_donors(state, city);
CREATE INDEX idx_donors_status ON public.blood_donors(status);
CREATE INDEX idx_donors_mobile ON public.blood_donors(mobile);
CREATE INDEX idx_donors_user ON public.blood_donors(user_id);
CREATE OR REPLACE FUNCTION private.set_donor_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.donor_id IS NULL OR NEW.donor_id = '' THEN NEW.donor_id := private.make_ref('BD', 'private.seq_blood_donor'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_donor_ref BEFORE INSERT ON public.blood_donors FOR EACH ROW EXECUTE FUNCTION private.set_donor_ref();
CREATE TRIGGER trg_donor_upd BEFORE UPDATE ON public.blood_donors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.blood_donors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_donors TO authenticated;
GRANT ALL ON public.blood_donors TO service_role;
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can register as donor" ON public.blood_donors FOR INSERT WITH CHECK (true);
CREATE POLICY "donor reads own record" ON public.blood_donors FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.can_manage_blood());
CREATE POLICY "donor updates own record" ON public.blood_donors FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.can_manage_blood()) WITH CHECK (user_id = auth.uid() OR private.can_manage_blood());
CREATE POLICY "blood manager deletes donor" ON public.blood_donors FOR DELETE TO authenticated USING (private.can_manage_blood());

-- BLOOD REQUIREMENTS
CREATE TABLE public.blood_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id TEXT UNIQUE,
  patient_name TEXT NOT NULL, patient_age INTEGER,
  hospital TEXT NOT NULL, hospital_contact TEXT,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','O+','O-','AB+','AB-','Bombay','Rare/Other')),
  component TEXT NOT NULL DEFAULT 'Whole Blood' CHECK (component IN ('Whole Blood','RDP','SDP','Plasma','Other')),
  units_required INTEGER NOT NULL DEFAULT 1,
  state TEXT, district TEXT, city TEXT, required_date DATE,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('critical','urgent','normal')),
  requester_name TEXT NOT NULL, requester_mobile TEXT NOT NULL, requester_whatsapp TEXT, notes TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','active','fulfilled','expired','cancelled')),
  public_visibility BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  requisition_slip TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.blood_requirements.requisition_slip IS 'Private storage path (bucket blood-requisitions) of the hospital requisition slip uploaded by the requester.';
CREATE INDEX idx_req_group ON public.blood_requirements(blood_group);
CREATE INDEX idx_req_loc ON public.blood_requirements(state, city);
CREATE INDEX idx_req_status ON public.blood_requirements(verification_status);
CREATE INDEX idx_req_created ON public.blood_requirements(created_at DESC);
CREATE OR REPLACE FUNCTION private.set_req_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.requirement_id IS NULL OR NEW.requirement_id = '' THEN NEW.requirement_id := private.make_ref('BR', 'private.seq_blood_req'); END IF;
  IF NEW.expires_at IS NULL THEN NEW.expires_at := now() + interval '7 days'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_req_ref BEFORE INSERT ON public.blood_requirements FOR EACH ROW EXECUTE FUNCTION private.set_req_ref();
CREATE TRIGGER trg_req_upd BEFORE UPDATE ON public.blood_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT, SELECT ON public.blood_requirements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blood_requirements TO authenticated;
GRANT ALL ON public.blood_requirements TO service_role;
ALTER TABLE public.blood_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can post requirement" ON public.blood_requirements FOR INSERT WITH CHECK (true);
CREATE POLICY "public reads live requirements" ON public.blood_requirements FOR SELECT USING (
  (public_visibility = true AND verification_status IN ('verified','active') AND (expires_at IS NULL OR expires_at > now()))
  OR private.can_manage_blood()
);
CREATE POLICY "blood manager writes requirements" ON public.blood_requirements FOR UPDATE TO authenticated USING (private.can_manage_blood()) WITH CHECK (private.can_manage_blood());
CREATE POLICY "blood manager deletes requirements" ON public.blood_requirements FOR DELETE TO authenticated USING (private.can_manage_blood());

-- LIBRARY
CREATE TABLE public.book_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE, description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_bcat_upd BEFORE UPDATE ON public.book_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.book_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_categories TO authenticated;
GRANT ALL ON public.book_categories TO service_role;
ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.book_categories FOR SELECT USING (active = true OR private.can_manage_library());
CREATE POLICY "categories library write" ON public.book_categories FOR ALL TO authenticated USING (private.can_manage_library()) WITH CHECK (private.can_manage_library());

CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id TEXT UNIQUE, isbn TEXT, title TEXT NOT NULL, subtitle TEXT, author TEXT, publisher TEXT,
  edition TEXT, language TEXT,
  category_id UUID REFERENCES public.book_categories(id) ON DELETE SET NULL,
  subject TEXT, class_level TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  available_quantity INTEGER NOT NULL DEFAULT 1,
  shelf TEXT, location TEXT, cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','lost','damaged')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_books_title ON public.books(title);
CREATE INDEX idx_books_author ON public.books(author);
CREATE INDEX idx_books_status ON public.books(status);
CREATE INDEX idx_books_cat ON public.books(category_id);
CREATE OR REPLACE FUNCTION private.set_book_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.book_id IS NULL OR NEW.book_id = '' THEN NEW.book_id := private.make_ref('LIB', 'private.seq_book'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_book_ref BEFORE INSERT ON public.books FOR EACH ROW EXECUTE FUNCTION private.set_book_ref();
CREATE TRIGGER trg_book_upd BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books public read" ON public.books FOR SELECT USING (status = 'active' OR private.can_manage_library());
CREATE POLICY "books library write" ON public.books FOR ALL TO authenticated USING (private.can_manage_library()) WITH CHECK (private.can_manage_library());

CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  student_code TEXT UNIQUE,
  full_name TEXT NOT NULL, gender TEXT, date_of_birth DATE,
  mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT, address TEXT, pincode TEXT,
  institution TEXT, course TEXT, class_level TEXT, id_document TEXT, photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','inactive')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_students_mobile ON public.students(mobile);
CREATE INDEX idx_students_user ON public.students(user_id);
CREATE OR REPLACE FUNCTION private.set_student_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN NEW.student_code := private.make_ref('STU', 'private.seq_student'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_student_ref BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION private.set_student_ref();
CREATE TRIGGER trg_student_upd BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can apply as student" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "student reads own" ON public.students FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.can_manage_library());
CREATE POLICY "student updates own" ON public.students FOR UPDATE TO authenticated USING (user_id = auth.uid() OR private.can_manage_library()) WITH CHECK (user_id = auth.uid() OR private.can_manage_library());
CREATE POLICY "library deletes student" ON public.students FOR DELETE TO authenticated USING (private.can_manage_library());

-- BOOK DONATION REQUESTS
CREATE TABLE public.book_donation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE,
  donor_name TEXT NOT NULL, mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT, address TEXT, pincode TEXT,
  book_count INTEGER, categories TEXT[],
  condition TEXT CHECK (condition IN ('new','good','average','old')),
  description TEXT,
  pickup_required BOOLEAN NOT NULL DEFAULT false,
  preferred_date DATE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','contacted','approved','pickup_scheduled','received','completed','rejected')),
  admin_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bdr_status ON public.book_donation_requests(status);
CREATE INDEX idx_bdr_created ON public.book_donation_requests(created_at DESC);
CREATE OR REPLACE FUNCTION private.set_bdr_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.request_id IS NULL OR NEW.request_id = '' THEN NEW.request_id := private.make_ref('BKD', 'private.seq_book_don'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_bdr_ref BEFORE INSERT ON public.book_donation_requests FOR EACH ROW EXECUTE FUNCTION private.set_bdr_ref();
CREATE TRIGGER trg_bdr_upd BEFORE UPDATE ON public.book_donation_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.book_donation_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_donation_requests TO authenticated;
GRANT ALL ON public.book_donation_requests TO service_role;
ALTER TABLE public.book_donation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submits book donation" ON public.book_donation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "staff reads book donations" ON public.book_donation_requests FOR SELECT TO authenticated USING (private.is_staff());
CREATE POLICY "staff updates book donations" ON public.book_donation_requests FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
CREATE POLICY "admin deletes book donations" ON public.book_donation_requests FOR DELETE TO authenticated USING (private.is_admin());

-- MATERIAL DONATION REQUESTS
CREATE TABLE public.material_donation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE,
  donor_name TEXT NOT NULL, mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT, address TEXT, pincode TEXT,
  material TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('ration','rice','wheat','pulses','vegetables','clothes','education_material','medical_material','hygiene','other')),
  quantity NUMERIC(12,2), unit TEXT,
  pickup_required BOOLEAN NOT NULL DEFAULT false,
  preferred_date DATE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','contacted','approved','pickup_scheduled','received','completed','rejected')),
  admin_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mdr_status ON public.material_donation_requests(status);
CREATE INDEX idx_mdr_created ON public.material_donation_requests(created_at DESC);
CREATE OR REPLACE FUNCTION private.set_mdr_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.request_id IS NULL OR NEW.request_id = '' THEN NEW.request_id := private.make_ref('MD', 'private.seq_material_don'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_mdr_ref BEFORE INSERT ON public.material_donation_requests FOR EACH ROW EXECUTE FUNCTION private.set_mdr_ref();
CREATE TRIGGER trg_mdr_upd BEFORE UPDATE ON public.material_donation_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.material_donation_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_donation_requests TO authenticated;
GRANT ALL ON public.material_donation_requests TO service_role;
ALTER TABLE public.material_donation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submits material donation" ON public.material_donation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "staff reads material donations" ON public.material_donation_requests FOR SELECT TO authenticated USING (private.is_staff());
CREATE POLICY "staff updates material donations" ON public.material_donation_requests FOR UPDATE TO authenticated USING (private.is_staff()) WITH CHECK (private.is_staff());
CREATE POLICY "admin deletes material donations" ON public.material_donation_requests FOR DELETE TO authenticated USING (private.is_admin());

-- VOLUNTEER APPLICATIONS
CREATE TABLE public.volunteer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL, photo TEXT, dob DATE, gender TEXT,
  mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT, address TEXT, pincode TEXT,
  education TEXT, occupation TEXT, skills TEXT, areas_of_interest TEXT[], availability TEXT,
  preferred_seva_projects UUID[], id_document TEXT,
  consent BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected')),
  designation TEXT,
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','failed')),
  payment_reference TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vol_status ON public.volunteer_applications(status);
CREATE INDEX idx_vol_created ON public.volunteer_applications(created_at DESC);
CREATE OR REPLACE FUNCTION private.set_vol_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.application_id = '' THEN NEW.application_id := private.make_ref('VOL', 'private.seq_volunteer'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_vol_ref BEFORE INSERT ON public.volunteer_applications FOR EACH ROW EXECUTE FUNCTION private.set_vol_ref();
CREATE TRIGGER trg_vol_upd BEFORE UPDATE ON public.volunteer_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.volunteer_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_applications TO authenticated;
GRANT ALL ON public.volunteer_applications TO service_role;
ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone applies volunteer" ON public.volunteer_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "reviewer reads volunteers" ON public.volunteer_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.can_manage_volunteers());
CREATE POLICY "reviewer updates volunteers" ON public.volunteer_applications FOR UPDATE TO authenticated USING (private.can_manage_volunteers()) WITH CHECK (private.can_manage_volunteers());
CREATE POLICY "admin deletes volunteers" ON public.volunteer_applications FOR DELETE TO authenticated USING (private.is_admin());

-- INTERNSHIP
CREATE TABLE public.internship_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, department TEXT, description TEXT,
  duration TEXT, eligibility TEXT, seats INTEGER,
  fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE, end_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_ip_upd BEFORE UPDATE ON public.internship_programs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT SELECT ON public.internship_programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internship_programs TO authenticated;
GRANT ALL ON public.internship_programs TO service_role;
ALTER TABLE public.internship_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs public read" ON public.internship_programs FOR SELECT USING (active = true OR private.can_manage_internships());
CREATE POLICY "programs manager write" ON public.internship_programs FOR ALL TO authenticated USING (private.can_manage_internships()) WITH CHECK (private.can_manage_internships());

CREATE TABLE public.intern_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.internship_programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL, photo TEXT, dob DATE, gender TEXT,
  mobile TEXT NOT NULL, whatsapp TEXT, email TEXT,
  state TEXT, district TEXT, city TEXT,
  college TEXT, course TEXT, year TEXT, skills TEXT, resume TEXT, preferred_department TEXT, duration TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','completed')),
  payment_status TEXT NOT NULL DEFAULT 'not_required' CHECK (payment_status IN ('not_required','pending','paid','failed')),
  payment_reference TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_intern_status ON public.intern_applications(status);
CREATE INDEX idx_intern_created ON public.intern_applications(created_at DESC);
CREATE OR REPLACE FUNCTION private.set_intern_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.application_id = '' THEN NEW.application_id := private.make_ref('INT', 'private.seq_intern'); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_intern_ref BEFORE INSERT ON public.intern_applications FOR EACH ROW EXECUTE FUNCTION private.set_intern_ref();
CREATE TRIGGER trg_intern_upd BEFORE UPDATE ON public.intern_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
GRANT INSERT ON public.intern_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intern_applications TO authenticated;
GRANT ALL ON public.intern_applications TO service_role;
ALTER TABLE public.intern_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone applies intern" ON public.intern_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "reviewer reads interns" ON public.intern_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.can_manage_internships());
CREATE POLICY "reviewer updates interns" ON public.intern_applications FOR UPDATE TO authenticated USING (private.can_manage_internships()) WITH CHECK (private.can_manage_internships());
CREATE POLICY "admin deletes interns" ON public.intern_applications FOR DELETE TO authenticated USING (private.is_admin());;
