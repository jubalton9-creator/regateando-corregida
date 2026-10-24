CREATE TABLE public.garage_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 name text NOT NULL CHECK (length(trim(name)) > 0),
 price integer NOT NULL CHECK (price > 0),
 photos text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.garage_products TO authenticated;
GRANT ALL ON public.garage_products TO service_role;
ALTER TABLE public.garage_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY garage_owner_read ON public.garage_products FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE POLICY garage_registered_insert ON public.garage_products FOR INSERT TO authenticated WITH CHECK (
 owner_id = (select auth.uid()) AND (
 EXISTS (SELECT 1 FROM public.compradores c WHERE c.user_id = (select auth.uid())) OR
 EXISTS (SELECT 1 FROM public.vendedores v WHERE v.owner_id = (select auth.uid())) OR
 EXISTS (SELECT 1 FROM public.suppliers s WHERE s.owner_id = (select auth.uid()))
 )
);