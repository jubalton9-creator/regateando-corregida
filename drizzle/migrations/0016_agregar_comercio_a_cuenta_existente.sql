CREATE OR REPLACE FUNCTION public.agregar_comercio_propio(_m jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _nombre text := NULLIF(_m->>'nombre','');
  _tel text := NULLIF(_m->>'phone','');
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;
  IF EXISTS (SELECT 1 FROM public.vendedores WHERE owner_id = _uid) THEN
    RETURN 'ya_existe';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.user_roles (user_id, role) VALUES (_uid, 'vendedor') ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.vendedores (owner_id, nombre_comercio, nombre, apellido, dni, cuit, telefono, rubro, direccion, whatsapp, correo, zona, barrio)
  VALUES (
    _uid,
    COALESCE(NULLIF(_m->>'nombre_comercio',''), COALESCE(_nombre, 'Sin nombre')),
    _nombre,
    _m->>'apellido',
    COALESCE(NULLIF(_m->>'dni',''), ''),
    COALESCE(NULLIF(_m->>'cuit',''), ''),
    COALESCE(NULLIF(_m->>'telefono',''), ''),
    COALESCE(NULLIF(_m->>'rubro',''), 'Sin definir'),
    COALESCE(NULLIF(_m->>'direccion',''), 'Sin definir'),
    COALESCE(_tel, COALESCE(_m->>'whatsapp',''), ''),
    _email,
    NULLIF(_m->>'zona',''),
    NULLIF(_m->>'barrio','')
  );

  IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE owner_id = _uid) THEN
    INSERT INTO public.suppliers (owner_id, name, category, address, phone, zone, active)
    VALUES (
      _uid,
      COALESCE(NULLIF(_m->>'nombre_comercio',''), COALESCE(_nombre, 'Sin nombre')),
      COALESCE(NULLIF(_m->>'rubro',''), 'Sin definir'),
      NULLIF(_m->>'direccion',''),
      COALESCE(_tel, NULLIF(_m->>'whatsapp','')),
      NULLIF(_m->>'zona',''),
      true
    );
  END IF;
  RETURN 'ok';
END;
$function$;

REVOKE ALL ON FUNCTION public.agregar_comercio_propio(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agregar_comercio_propio(jsonb) TO authenticated;