ALTER POLICY regateo_vendedor_insert ON public.regateo_mensajes WITH CHECK (autor = 'vendedor' AND EXISTS (SELECT 1 FROM public.cotizaciones c JOIN public.suppliers s ON s.id = c.supplier_id WHERE c.id = regateo_mensajes.cotizacion_id AND c.pedido_id = regateo_mensajes.pedido_id AND s.owner_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.validar_mensaje_regateo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE estado text; estado_pedido text; pedido uuid;
BEGIN
 SELECT c.status, c.pedido_id, p.status INTO estado, pedido, estado_pedido FROM public.cotizaciones c JOIN public.pedidos p ON p.id = c.pedido_id WHERE c.id = NEW.cotizacion_id FOR UPDATE OF c;
 IF pedido IS NULL OR pedido <> NEW.pedido_id THEN RAISE EXCEPTION 'Pedido inválido'; END IF;
 IF estado IN ('desistido','acordado','cerrado_vendedor','no_tengo') OR estado_pedido = 'desistido' THEN RAISE EXCEPTION 'Negociación cerrada'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validar_mensaje_regateo BEFORE INSERT ON public.regateo_mensajes FOR EACH ROW EXECUTE FUNCTION public.validar_mensaje_regateo();
REVOKE ALL ON FUNCTION public.validar_mensaje_regateo() FROM PUBLIC;
GRANT SELECT, INSERT ON public.regateo_mensajes TO authenticated;
GRANT ALL ON public.regateo_mensajes TO service_role;