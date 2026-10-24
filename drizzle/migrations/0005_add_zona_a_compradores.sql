ALTER TABLE public.compradores ADD COLUMN IF NOT EXISTS zona text;

COMMENT ON COLUMN public.compradores.zona IS 'Zona del conurbano bonaerense elegida en el desplegable del registro de compradores.';