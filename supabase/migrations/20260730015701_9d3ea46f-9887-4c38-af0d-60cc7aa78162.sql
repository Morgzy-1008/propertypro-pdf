DROP TRIGGER IF EXISTS set_land_lots_updated_at ON public.land_lots;
CREATE TRIGGER set_land_lots_updated_at BEFORE UPDATE ON public.land_lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_packages_updated_at ON public.packages;
CREATE TRIGGER set_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_package_requests_updated_at ON public.package_requests;
CREATE TRIGGER set_package_requests_updated_at BEFORE UPDATE ON public.package_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();