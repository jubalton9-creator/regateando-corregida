import { createFileRoute } from "@tanstack/react-router";

const CORREO_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const soloNumeros = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const escaparLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

export const Route = createFileRoute("/api/public/recuperar-clave")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Datos inválidos." }, { status: 400 });
        }
        const datos = (body ?? {}) as Record<string, unknown>;
        const correo = String(datos["correo"] ?? "").trim().toLowerCase();
        const dni = soloNumeros(datos["dni"]);
        const celular = soloNumeros(datos["celular"]);
        const nueva = typeof datos["nueva"] === "string" ? datos["nueva"] : "";

        if (!CORREO_OK.test(correo) || correo.length > 254) {
          return Response.json({ error: "Escribí un correo válido." }, { status: 400 });
        }
        if (dni.length < 7 || dni.length > 8) {
          return Response.json({ error: "El DNI debe tener entre 7 y 8 números." }, { status: 400 });
        }
        if (celular.length < 10 || celular.length > 15) {
          return Response.json({ error: "El celular debe tener al menos 10 números." }, { status: 400 });
        }
        if (nueva.length < 6 || nueva.length > 72) {
          return Response.json({
            error: "La nueva contraseña debe tener entre 6 y 72 caracteres.",
          }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: buyer, error: consultaError } = await supabaseAdmin
          .from("compradores")
          .select("user_id, dni, whatsapp")
          .ilike("correo", escaparLike(correo))
          .maybeSingle();

        if (consultaError || !buyer?.user_id) {
          return Response.json(
            { error: "No encontramos una ficha de comprador con ese correo." },
            { status: 404 },
          );
        }

        const esperadoDni = soloNumeros(buyer.dni);
        const esperadoCel = soloNumeros(buyer.whatsapp);
        if (!esperadoDni && !esperadoCel) {
          return Response.json(
            {
              error:
                "Esa ficha no tiene DNI ni celular cargados. Pedile al administrador una clave nueva.",
            },
            { status: 409 },
          );
        }

        const dniOk = !esperadoDni || dni === esperadoDni;
        const celOk = !esperadoCel || celular === esperadoCel;
        if (!dniOk || !celOk) {
          return Response.json(
            { error: "El DNI o el celular no coinciden con esa ficha." },
            { status: 403 },
          );
        }

        const { error } = await supabaseAdmin.auth.admin.updateUserById(buyer.user_id, {
          password: nueva,
        });
        if (error) {
          return Response.json(
            { error: "No pudimos cambiar la contraseña. Probá de nuevo." },
            { status: 500 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
