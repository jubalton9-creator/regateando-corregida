CREATE TABLE public.suppliers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    category text not null,
    address text,
    phone text,
    zone text,
    active boolean default true,
    created_at timestamptz default now()
);

CREATE TABLE public.products (
    id uuid primary key default gen_random_uuid(),
    supplier_id uuid not null references public.suppliers(id) on delete cascade,
    name text not null,
    description text,
    price integer not null,
    stock integer default 0,
    image_url text,
    created_at timestamptz default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT SELECT ON public.suppliers TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
GRANT SELECT ON public.products TO anon;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers are publicly readable"
ON public.suppliers
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can manage suppliers"
ON public.suppliers
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Products are publicly readable"
ON public.products
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can manage products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

INSERT INTO public.suppliers (name, category, address, phone, zone) VALUES
('Casa D Rentis', 'Ferretería', 'Santa Fe 214, Martínez, Buenos Aires', '1132289094', 'Martínez, Buenos Aires'),
('Roman Juarez', 'Ferretería', 'Sobremonte 1864, Victoria, Buenos Aires', '1132289094', 'Victoria, Buenos Aires'),
('El Mundo', 'Electrodomésticos', 'Lavalle 456, San Isidro, Buenos Aires', '1132289094', 'San Isidro, Buenos Aires'),
('Mi Hogar', 'Electrodomésticos', 'Avellaneda 2345, Virreyes, San Fernando, Buenos Aires', '1132289094', 'Virreyes, San Fernando, Buenos Aires'),
('Juan Fernandez', 'Pinturería', 'Maipú 1580, La Lucila, Vicente López, Buenos Aires', '1132289094', 'La Lucila, Vicente López, Buenos Aires'),
('Arco Iris', 'Pinturería', 'Miller 86, Victoria, Buenos Aires', '1132289094', 'Victoria, Buenos Aires');

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Taladro percutor 600W profesional', 'Taladro percutor con velocidad variable, ideal para hormigón y madera', 85000, 8
FROM public.suppliers WHERE name = 'Casa D Rentis';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Caja de herramientas completa 150 piezas', 'Set de herramientas básicas para el hogar y taller', 120000, 5
FROM public.suppliers WHERE name = 'Casa D Rentis';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Lijadora orbital 125mm', 'Lijadora orbital para acabado de madera y metal', 65000, 6
FROM public.suppliers WHERE name = 'Roman Juarez';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Juego de destornilladores imantados', 'Set de destornilladores planos y Phillips con punta imantada', 22000, 20
FROM public.suppliers WHERE name = 'Roman Juarez';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Licuadora de mesa 1.5L', 'Licuadora con vaso de vidrio, 5 velocidades y pulse', 55000, 12
FROM public.suppliers WHERE name = 'El Mundo';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Cafetera espresso automática', 'Cafetera espresso con espumador de leche, 15 bares', 180000, 3
FROM public.suppliers WHERE name = 'El Mundo';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Aspiradora sin bolsa 1800W', 'Aspiradora ciclónica sin bolsa, filtro HEPA', 95000, 7
FROM public.suppliers WHERE name = 'Mi Hogar';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Tostadora eléctrica 4 ranuras', 'Tostadora con 7 niveles de tostado y ranuras anchas', 35000, 10
FROM public.suppliers WHERE name = 'Mi Hogar';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Látex interior premium 20 litros', 'Látex interior lavable, blanco mate, alto rendimiento', 48000, 25
FROM public.suppliers WHERE name = 'Juan Fernandez';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Pintura sintética exterior 4 litros', 'Pintura sintética para exterior, resistente a la intemperie', 32000, 18
FROM public.suppliers WHERE name = 'Juan Fernandez';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Rodillo antigota 23cm', 'Rodillo profesional antigota para látex y sintéticos', 8500, 30
FROM public.suppliers WHERE name = 'Arco Iris';

INSERT INTO public.products (supplier_id, name, description, price, stock)
SELECT id, 'Barniz marino satinado 1 litro', 'Barniz marino para madera, acabado satinado', 15000, 22
FROM public.suppliers WHERE name = 'Arco Iris';