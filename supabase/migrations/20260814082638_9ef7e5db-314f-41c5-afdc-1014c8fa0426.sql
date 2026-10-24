
CREATE OR REPLACE VIEW public.suppliers_public
WITH (security_invoker = on) AS
SELECT id, name, category, zone, active FROM public.suppliers WHERE active;

GRANT SELECT (id, name, category, zone, active) ON public.suppliers TO anon;
GRANT SELECT ON public.suppliers_public TO anon, authenticated;

CREATE POLICY "Comercios activos visibles al publico"
ON public.suppliers FOR SELECT TO anon
USING (active);
