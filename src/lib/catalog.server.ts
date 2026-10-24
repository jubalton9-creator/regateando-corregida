import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CatalogItem } from "./catalog";

export async function getCatalog(): Promise<CatalogItem[]> {
  const supabase = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const { data: products, error } = await supabase
    .from("products")
    .select("*, suppliers:suppliers_public!inner(id, name, zone, active)")
    .eq("suppliers.active", true)
    .order("created_at", { ascending: false });


  if (error) {
    console.error("Error cargando catálogo:", error);
    throw new Error(`No se pudo cargar el catálogo: ${error.message}`);
  }

  return (products || []).map((p) => {
    const supplier = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;
    return {
      id: p.id,
      nombre: p.name,
      descripcion: p.description || "",
      precio: p.price,
      vendedor: supplier?.name || "",
      zona: supplier?.zone || "",
      stock: p.stock ?? 0,
      imageUrl: p.image_url || "",
    };
  });
}

export async function getCatalogItemById(id: string): Promise<CatalogItem | null> {
  const catalog = await getCatalog();
  return catalog.find((item) => item.id === id) || null;
}

export type SupplierLite = {
  id: string;
  nombre: string;
  categoria: string;
  zona: string;
};

export async function getSuppliers(): Promise<SupplierLite[]> {
  const supabase = createClient<Database>(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"]!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase
    .from("suppliers_public")
    .select("id, name, category, zone")
    .eq("active", true);


  if (error) {
    console.error("Error cargando vendedores:", error);
    return [];
  }

  return (data || []).map((s) => ({
    id: s.id ?? "",
    nombre: s.name ?? "",
    categoria: s.category ?? "",
    zona: s.zone || "",
  }));

}
