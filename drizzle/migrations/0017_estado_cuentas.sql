ALTER TABLE public.compradores ADD COLUMN estado text NOT NULL DEFAULT 'activo';
ALTER TABLE public.vendedores ADD COLUMN estado text NOT NULL DEFAULT 'activo';
ALTER TABLE public.suppliers ADD COLUMN estado text NOT NULL DEFAULT 'activo';