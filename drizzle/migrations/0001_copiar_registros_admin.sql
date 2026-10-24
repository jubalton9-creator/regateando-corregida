CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _role text := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'cliente');
  _nombre text := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
  _tel text := NEW.raw_user_meta_data->>'phone';
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, _nombre, _tel) ON CONFLICT (id) DO NOTHING;

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
        INSERT INTO public.compradores (user_id, nombre, whatsapp, correo, metodo)
        VALUES (NEW.id, _nombre, _tel, NEW.email, COALESCE(NEW.raw_app_meta_data->>'provider', 'email'));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$function$;

INSERT INTO public.compradores (user_id, nombre, correo, metodo)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'), u.email, COALESCE(u.raw_app_meta_data->>'provider','email')
FROM auth.users u
WHERE COALESCE(NULLIF(u.raw_user_meta_data->>'role',''),'cliente') <> 'vendedor'
  AND NOT EXISTS (SELECT 1 FROM public.compradores c WHERE c.user_id = u.id);

INSERT INTO public.vendedores (owner_id, nombre_comercio, nombre, rubro, direccion, whatsapp, correo)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'Sin nombre'), u.raw_user_meta_data->>'full_name', 'Sin definir', 'Sin definir', COALESCE(u.raw_user_meta_data->>'phone',''), u.email
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'vendedor'
  AND NOT EXISTS (SELECT 1 FROM public.vendedores v WHERE v.owner_id = u.id);

UPDATE public.compradores c SET correo = u.email FROM auth.users u WHERE u.id = c.user_id AND c.correo IS NULL;