ALTER TABLE public.compradores ADD COLUMN IF NOT EXISTS barrio text;
ALTER TABLE public.vendedores ADD COLUMN IF NOT EXISTS barrio text;