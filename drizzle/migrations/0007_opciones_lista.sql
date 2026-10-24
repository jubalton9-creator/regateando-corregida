CREATE TABLE public.opciones_lista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('zona','rubro')),
  valor text NOT NULL CHECK (length(trim(valor)) BETWEEN 1 AND 60),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo, valor)
);
GRANT SELECT ON public.opciones_lista TO anon;
GRANT SELECT, INSERT, UPDATE ON public.opciones_lista TO authenticated;
GRANT ALL ON public.opciones_lista TO service_role;
ALTER TABLE public.opciones_lista ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leer opciones" ON public.opciones_lista FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "agregar opciones activas" ON public.opciones_lista FOR INSERT TO authenticated WITH CHECK (activo = true);
CREATE POLICY "admin cambia opciones" ON public.opciones_lista FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'));
INSERT INTO public.opciones_lista (tipo, valor) SELECT 'zona', v FROM unnest(ARRAY['Victoria','San Fernando','Tigre','San Isidro','Vicente López','Escobar','Pilar','José C. Paz','Malvinas Argentinas','San Miguel','Hurlingham','Ituzaingó','Morón','Tres de Febrero','San Martín','La Matanza','Merlo','Moreno','Lomas de Zamora','Lanús','Avellaneda','Quilmes','Berazategui','Florencio Varela','Almirante Brown','Esteban Echeverría','Ezeiza','Presidente Perón','San Vicente','Cañuelas','Marcos Paz','General Las Heras','Tigre - Nordelta','CABA']) v;
INSERT INTO public.opciones_lista (tipo, valor) SELECT 'rubro', v FROM unnest(ARRAY['Ferretería','Pinturería','Electrodomésticos','Corralón / Materiales','Almacén / Autoservicio','Kiosco','Panadería','Verdulería','Carnicería','Farmacia','Librería / Regalos','Bazar / Cocina','Mueblería','Indumentaria','Calzado','Óptica','Gomería','Servicios / Reparaciones']) v;