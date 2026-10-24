import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const cambiarClave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { nueva: string }) => {
    if (typeof d?.nueva !== "string" || d.nueva.length < 6 || d.nueva.length > 72) {
      throw new Error("La contraseña debe tener entre 6 y 72 caracteres");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.nueva,
    });
    if (error) throw new Error("No pudimos cambiar la contraseña");
    return { ok: true };
  });
