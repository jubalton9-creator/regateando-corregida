CREATE TABLE public.regateo_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL,
  pedido_id uuid NOT NULL,
  autor text NOT NULL CHECK (autor IN ('comprador','vendedor')),
  tipo text NOT NULL DEFAULT 'oferta' CHECK (tipo IN ('oferta','consulta')),
  texto text NOT NULL DEFAULT '',
  precio numeric,
  fotos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX regateo_mensajes_cotizacion_idx ON public.regateo_mensajes (cotizacion_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regateo_mensajes TO authenticated;
GRANT ALL ON public.regateo_mensajes TO service_role;
ALTER TABLE public.regateo_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY regateo_vendedor_select ON public.regateo_mensajes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.cotizaciones c
    JOIN public.suppliers s ON s.id = c.supplier_id
    WHERE c.id = regateo_mensajes.cotizacion_id
      AND s.owner_id = auth.uid()
  ));
CREATE POLICY regateo_vendedor_insert ON public.regateo_mensajes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.cotizaciones c
    JOIN public.suppliers s ON s.id = c.supplier_id
    WHERE c.id = regateo_mensajes.cotizacion_id
      AND s.owner_id = auth.uid()
  ));