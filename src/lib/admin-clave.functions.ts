import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Solo el administrador puede asignar una contraseña nueva a un comprador o vendedor.
export const asignarClaveAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tabla: "compradores" | "vendedores"; filaId: string; nueva: string }) => {
    if (d?.tabla !== "compradores" && d?.tabla !== "vendedores") throw new Error("Tabla inválida");
    if (typeof d.filaId !== "string" || !d.filaId) throw new Error("Falta el registro");
    if (typeof d.nueva !== "string" || d.nueva.length < 6 || d.nueva.length > 72)
      throw new Error("La contraseña debe tener entre 6 y 72 caracteres");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin");
    if (!roles || roles.length === 0) throw new Error("Sin permiso");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const col = data.tabla === "compradores" ? "user_id" : "owner_id";
    const { data: fila } = await supabaseAdmin.from(data.tabla).select(col).eq("id", data.filaId).maybeSingle();
    const uid = (fila as Record<string, string> | null)?.[col];
    if (!uid) throw new Error("Este registro no tiene cuenta asociada");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { password: data.nueva });
    if (error) throw new Error("No pudimos cambiar la contraseña");
    return { ok: true };
  });
