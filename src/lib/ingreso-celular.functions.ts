import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const soloNumeros = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Ingreso con correo + celular: verifica que coincidan con una ficha y devuelve un token de un solo uso. */
export const ingresarConCelular = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ correo: z.string().trim().email().max(255), celular: z.string().trim().min(8).max(30) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const correo = data.correo.toLowerCase();
    const cel = soloNumeros(data.celular);
    const fallo = { ok: false as const, tokenHash: null };
    if (cel.length < 8) return fallo;

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: correo });
    if (error || !link.user) return fallo;
    const uid = link.user.id;

    const [c, v] = await Promise.all([
      supabaseAdmin.from("compradores").select("whatsapp").eq("user_id", uid).maybeSingle(),
      supabaseAdmin.from("vendedores").select("whatsapp, telefono").eq("owner_id", uid).maybeSingle(),
    ]);
    const telefonos = [c.data?.whatsapp, v.data?.whatsapp, v.data?.telefono, link.user.user_metadata?.["phone"] as string | undefined]
      .map(soloNumeros)
      .filter((t) => t.length >= 8);
    const coincide = telefonos.some((t) => t.endsWith(cel.slice(-8)) && cel.endsWith(t.slice(-8)));
    if (!coincide) return fallo;
    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });
