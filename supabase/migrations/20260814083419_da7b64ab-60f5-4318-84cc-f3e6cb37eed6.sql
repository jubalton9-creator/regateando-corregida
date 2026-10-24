ALTER VIEW public.vendedores_public SET (security_invoker = on);
GRANT SELECT (id, nombre_comercio, rubro, zona, activo) ON public.vendedores TO anon;
CREATE POLICY "Publico ve comercios activos" ON public.vendedores FOR SELECT TO anon USING (activo);