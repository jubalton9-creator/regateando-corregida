-- COMPRADORES
CREATE TABLE public.compradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  nombre text,
  whatsapp text,
  metodo text NOT NULL DEFAULT 'google',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compradores TO authenticated;
GRANT ALL ON public.compradores TO service_role;
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comprador ve su registro" ON public.compradores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Comprador crea su registro" ON public.compradores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Comprador edita su registro" ON public.compradores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- VENDEDORES
CREATE TABLE public.vendedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  nombre_comercio text NOT NULL,
  rubro text NOT NULL,
  direccion text NOT NULL,
  lat double precision,
  lng double precision,
  zona text,
  whatsapp text NOT NULL,
  whatsapp_verificado boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendedores TO authenticated;
GRANT ALL ON public.vendedores TO service_role;
ALTER TABLE public.vendedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendedor ve su comercio" ON public.vendedores FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Vendedor crea su comercio" ON public.vendedores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Vendedor edita su comercio" ON public.vendedores FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Vista pública sin datos sensibles
CREATE VIEW public.vendedores_public AS
  SELECT id, nombre_comercio, rubro, zona, activo FROM public.vendedores WHERE activo;
GRANT SELECT ON public.vendedores_public TO anon, authenticated;

-- PAGOS (checkout simulado)
CREATE TABLE public.pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  pedido_id uuid,
  descripcion text NOT NULL,
  monto integer NOT NULL,
  moneda text NOT NULL DEFAULT 'ARS',
  estado text NOT NULL DEFAULT 'pendiente',
  referencia text NOT NULL DEFAULT concat('SIM-', upper(substr(md5(random()::text), 1, 10))),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pagos TO authenticated;
GRANT ALL ON public.pagos TO service_role;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comprador ve sus pagos" ON public.pagos FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Comprador crea sus pagos" ON public.pagos FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

-- updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER compradores_updated_at BEFORE UPDATE ON public.compradores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER vendedores_updated_at BEFORE UPDATE ON public.vendedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();