CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.has_any_role(uuid, public.app_role[]) SET SCHEMA private;
ALTER FUNCTION public.is_admin() SET SCHEMA private;
ALTER FUNCTION public.is_super_admin() SET SCHEMA private;
ALTER FUNCTION public.can_manage_content() SET SCHEMA private;
ALTER FUNCTION public.is_staff() SET SCHEMA private;
ALTER FUNCTION public.can_manage_blood() SET SCHEMA private;
ALTER FUNCTION public.can_manage_library() SET SCHEMA private;
ALTER FUNCTION public.can_manage_volunteers() SET SCHEMA private;
ALTER FUNCTION public.can_manage_internships() SET SCHEMA private;

ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = private, public;
ALTER FUNCTION private.has_any_role(uuid, public.app_role[]) SET search_path = private, public;
ALTER FUNCTION private.is_admin() SET search_path = private, public;
ALTER FUNCTION private.is_super_admin() SET search_path = private, public;
ALTER FUNCTION private.can_manage_content() SET search_path = private, public;
ALTER FUNCTION private.is_staff() SET search_path = private, public;
ALTER FUNCTION private.can_manage_blood() SET search_path = private, public;
ALTER FUNCTION private.can_manage_library() SET search_path = private, public;
ALTER FUNCTION private.can_manage_volunteers() SET search_path = private, public;
ALTER FUNCTION private.can_manage_internships() SET search_path = private, public;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated, service_role;