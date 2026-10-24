CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _m jsonb := NEW.raw_user_meta_data;
  _role text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'cliente');
  _nombre text := COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  _tel text := NEW.raw_user_meta_data->>'phone';
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(_m->>'full_name', _nombre), _tel) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role::public.app_role) ON CONFLICT (user_id, role) DO NOTHING;

  BEGIN
    IF _role = 'vendedor' THEN
      IF NOT EXISTS (SELECT 1 FROM public.vendedores WHERE owner_id = NEW.id) THEN
        INSERT INTO public.vendedores (owner_id, nombre_comercio, nombre, apellido, dni, cuit, telefono, rubro, direccion, whatsapp, correo, zona, barrio)
        VALUES (
          NEW.id,
          COALESCE(NULLIF(_m->>'nombre_comercio',''), COALESCE(_nombre, 'Sin nombre')),
          _nombre,
          _m->>'apellido',
          COALESCE(NULLIF(_m->>'dni',''), ''),
          COALESCE(NULLIF(_m->>'cuit',''), ''),
          COALESCE(NULLIF(_m->>'telefono',''), ''),
          COALESCE(NULLIF(_m->>'rubro',''), 'Sin definir'),
          COALESCE(NULLIF(_m->>'direccion',''), 'Sin definir'),
          COALESCE(_tel, COALESCE(_m->>'whatsapp',''), ''),
          NEW.email,
          NULLIF(_m->>'zona',''),
          NULLIF(_m->>'barrio','')
        );
      END IF;
      -- Espejo en suppliers: de ahí leen la IA que elige comercios, los avisos
      -- de pedidos y la solapa Comercios de Administración.
      IF NOT EXISTS (SELECT 1 FROM public.suppliers WHERE owner_id = NEW.id) THEN
        INSERT INTO public.suppliers (owner_id, name, category, address, phone, zone, active)
        VALUES (
          NEW.id,
          COALESCE(NULLIF(_m->>'nombre_comercio',''), COALESCE(_nombre, 'Sin nombre')),
          COALESCE(NULLIF(_m->>'rubro',''), 'Sin definir'),
          NULLIF(_m->>'direccion',''),
          COALESCE(_tel, NULLIF(_m->>'whatsapp','')),
          NULLIF(_m->>'zona',''),
          true
        );
      END IF;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.compradores WHERE user_id = NEW.id) THEN
        INSERT INTO public.compradores (user_id, nombre, apellido, dni, whatsapp, correo, metodo, zona, barrio)
        VALUES (NEW.id, _nombre, _m->>'apellido', _m->>'dni', _tel, NEW.email, COALESCE(NEW.raw_app_meta_data->>'provider', 'email'), NULLIF(_m->>'zona',''), NULLIF(_m->>'barrio',''));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;