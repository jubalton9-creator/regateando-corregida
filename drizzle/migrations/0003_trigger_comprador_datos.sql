CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
        INSERT INTO public.vendedores (owner_id, nombre_comercio, nombre, rubro, direccion, whatsapp, correo)
        VALUES (NEW.id, COALESCE(_nombre, 'Sin nombre'), _nombre, 'Sin definir', 'Sin definir', COALESCE(_tel, ''), NEW.email);
      END IF;
    ELSE
      IF NOT EXISTS (SELECT 1 FROM public.compradores WHERE user_id = NEW.id) THEN
        INSERT INTO public.compradores (user_id, nombre, apellido, dni, alias, whatsapp, correo, metodo)
        VALUES (NEW.id, _nombre, _m->>'apellido', _m->>'dni', _m->>'alias', _tel, NEW.email, COALESCE(NEW.raw_app_meta_data->>'provider', 'email'));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;