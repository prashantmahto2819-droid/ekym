CREATE OR REPLACE FUNCTION private.set_donor_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.donor_id IS NULL OR NEW.donor_id = '' THEN
    NEW.donor_id := private.make_ref('BD', 'private.seq_blood_donor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_req_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.requirement_id IS NULL OR NEW.requirement_id = '' THEN
    NEW.requirement_id := private.make_ref('BR', 'private.seq_blood_req');
  END IF;
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_vol_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.application_id = '' THEN
    NEW.application_id := private.make_ref('VOL', 'private.seq_volunteer');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_intern_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.application_id IS NULL OR NEW.application_id = '' THEN
    NEW.application_id := private.make_ref('INT', 'private.seq_intern');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_bdr_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.request_id IS NULL OR NEW.request_id = '' THEN
    NEW.request_id := private.make_ref('BKD', 'private.seq_book_don');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_mdr_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.request_id IS NULL OR NEW.request_id = '' THEN
    NEW.request_id := private.make_ref('MD', 'private.seq_material_don');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_book_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.book_id IS NULL OR NEW.book_id = '' THEN
    NEW.book_id := private.make_ref('LIB', 'private.seq_book');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.set_student_ref() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = private, public, pg_temp AS $$
BEGIN
  IF NEW.student_code IS NULL OR NEW.student_code = '' THEN
    NEW.student_code := private.make_ref('STU', 'private.seq_student');
  END IF;
  RETURN NEW;
END;
$$;