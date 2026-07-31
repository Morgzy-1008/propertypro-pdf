REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_approved_staff() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_staff() TO authenticated, service_role;