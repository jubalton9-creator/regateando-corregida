
-- PRODUCTS: quitar política abierta y limitar al dueño del comercio
DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;

CREATE POLICY "Vendedores gestionan productos de su comercio"
ON public.products FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = products.supplier_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = products.supplier_id AND s.owner_id = auth.uid()));

-- SUPPLIERS: quitar política abierta y lectura pública con PII
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Suppliers are publicly readable" ON public.suppliers;

CREATE POLICY "Usuarios autenticados ven comercios"
ON public.suppliers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Vendedores pueden reclamar comercio sin dueno"
ON public.suppliers FOR UPDATE TO authenticated
USING (owner_id IS NULL)
WITH CHECK (owner_id = auth.uid());

REVOKE ALL ON public.suppliers FROM anon;
REVOKE ALL ON public.products FROM anon;
GRANT SELECT ON public.products TO anon;

-- Vista pública sin datos de contacto
CREATE OR REPLACE VIEW public.suppliers_public
WITH (security_invoker = off) AS
SELECT id, name, category, zone, active FROM public.suppliers WHERE active;

GRANT SELECT ON public.suppliers_public TO anon, authenticated;

-- Funciones SECURITY DEFINER no deben ser invocables por usuarios
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
