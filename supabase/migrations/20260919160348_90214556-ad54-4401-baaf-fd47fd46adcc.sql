CREATE OR REPLACE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_role(auth.uid(), 'SUPER_ADMIN'::public.app_role);
$$;

CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.is_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','CONTENT_MANAGER','STAFF','AUDITOR',
    'BLOOD_MANAGER','LIBRARY_MANAGER','VOLUNTEER_MANAGER','INTERNSHIP_MANAGER','HR_MANAGER','ACCOUNTANT']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.can_manage_content() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','CONTENT_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.can_manage_blood() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','BLOOD_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.can_manage_library() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','LIBRARY_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.can_manage_volunteers() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','VOLUNTEER_MANAGER','HR_MANAGER']::public.app_role[]);
$$;

CREATE OR REPLACE FUNCTION private.can_manage_internships() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = private, public AS $$
  SELECT private.has_any_role(auth.uid(), ARRAY['SUPER_ADMIN','ADMIN','INTERNSHIP_MANAGER','HR_MANAGER']::public.app_role[]);
$$;