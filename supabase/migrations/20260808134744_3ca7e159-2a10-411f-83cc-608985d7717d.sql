CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid,
  detalle text NOT NULL,
  fotos text[] NOT NULL DEFAULT '{}',
  categoria text,
  status text NOT NULL DEFAULT 'abierto',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendiente',
  precio integer,
  entrega text,
  mensaje text,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (pedido_id, supplier_id)
);

CREATE INDEX cotizaciones_supplier_idx ON public.cotizaciones (supplier_id, status);
CREATE INDEX cotizaciones_pedido_idx ON public.cotizaciones (pedido_id);

GRANT SELECT, UPDATE ON public.cotizaciones TO authenticated;
GRANT ALL ON public.cotizaciones TO service_role;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores ven sus cotizaciones"
ON public.cotizaciones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = cotizaciones.supplier_id AND s.owner_id = auth.uid()));

CREATE POLICY "Vendedores responden sus cotizaciones"
ON public.cotizaciones FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = cotizaciones.supplier_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.suppliers s WHERE s.id = cotizaciones.supplier_id AND s.owner_id = auth.uid()));

CREATE POLICY "Vendedores ven pedidos derivados"
ON public.pedidos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cotizaciones c
  JOIN public.suppliers s ON s.id = c.supplier_id
  WHERE c.pedido_id = pedidos.id AND s.owner_id = auth.uid()
));

CREATE POLICY "Compradores ven sus pedidos"
ON public.pedidos FOR SELECT TO authenticated
USING (buyer_id = auth.uid());