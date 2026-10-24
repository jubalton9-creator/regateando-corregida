ALTER TABLE public.opciones_lista ADD COLUMN original boolean NOT NULL DEFAULT false;
UPDATE public.opciones_lista SET original = true WHERE created_at <= (SELECT min(created_at) + interval '1 minute' FROM public.opciones_lista);
DROP POLICY "agregar opciones activas" ON public.opciones_lista;
CREATE POLICY "agregar opciones activas" ON public.opciones_lista FOR INSERT TO authenticated WITH CHECK (activo = true AND original = false);