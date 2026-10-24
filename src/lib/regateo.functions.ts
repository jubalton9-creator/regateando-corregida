import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { getRequest } from "@tanstack/react-start/server";
import { cancellationTokenHash } from "@/lib/pedido-state";

export type MensajeRegateo = {
  id: string;
  autor: "comprador" | "vendedor";
  tipo: "oferta" | "consulta";
  texto: string;
  precio: number | null;
  fotos: string[];
  createdAt: string;
};

export type EstadoRegateo = {
  status: string;
  precioAcordado: number | null;
  detalle: string;
  buyerName: string;
  pedidoStatus: string;
  mensajes: MensajeRegateo[];
};

const CotizacionInput = z.object({ cotizacionId: z.string().uuid() });
const CompradorInput = CotizacionInput.extend({ cancellationToken: z.string().min(64).max(100) });
async function autorizarComprador(cotizacionId: string, token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: c } = await supabaseAdmin.from("cotizaciones").select("pedido_id").eq("id", cotizacionId).maybeSingle();
  if (!c) throw new Error("No encontramos esta negociación");
  const hash = await cancellationTokenHash(token);
  const { data: pedido } = await supabaseAdmin.from("pedidos").select("id").eq("id", c.pedido_id).eq("cancellation_token_hash", hash).maybeSingle();
  if (!pedido) throw new Error("No tenés acceso a esta negociación");
  return supabaseAdmin;
}

const MensajeCompradorInput = CompradorInput.extend({
  tipo: z.enum(["oferta", "consulta"]).default("oferta"),
  texto: z.string().max(500).default(""),
  precio: z.number().int().positive().optional(),
});

const MensajeVendedorInput = z.object({
  cotizacionId: z.string().uuid(),
  texto: z.string().max(500).default(""),
  precio: z.number().int().positive().optional(),
  fotos: z.array(z.string()).max(3).default([]),
});

const CerrarRegateoInput = z.object({
  cotizacionId: z.string().uuid(),
  decision: z.enum(["trato", "desisto"]),
});

const ESTADOS_CERRADOS = new Set(["desistido", "acordado", "cerrado_vendedor", "no_tengo"]);

function mapearMensajes(rows: Array<Record<string, unknown>> | null): MensajeRegateo[] {
  return (rows ?? []).map((m) => ({
    id: String(m["id"]),
    autor: (m["autor"] as "comprador" | "vendedor") ?? "comprador",
    tipo: (m["tipo"] as "oferta" | "consulta") ?? "oferta",
    texto: (m["texto"] as string) ?? "",
    precio: m["precio"] === null || m["precio"] === undefined ? null : Number(m["precio"]),
    fotos: (m["fotos"] as string[]) ?? [],
    createdAt: String(m["created_at"]),
  }));
}

/** Lado comprador (sin sesión): lee la conversación y el estado del regateo. */
export const leerRegateoComprador = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CompradorInput.parse(input))
  .handler(async ({ data }): Promise<EstadoRegateo> => {
    const supabaseAdmin = await autorizarComprador(data.cotizacionId, data.cancellationToken);
    const { data: c, error } = await supabaseAdmin
      .from("cotizaciones")
      .select("id, status, precio, pedidos(status, detalle, buyer_name)")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("No encontramos esta negociación");

    const pedido = Array.isArray(c.pedidos) ? c.pedidos[0] : c.pedidos;
    const { data: rows, error: mErr } = await supabaseAdmin
      .from("regateo_mensajes")
      .select("id, autor, tipo, texto, precio, fotos, created_at")
      .eq("cotizacion_id", data.cotizacionId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    return {
      status: c.status,
      precioAcordado: c.status === "acordado" && c.precio !== null ? Number(c.precio) : null,
      detalle: pedido?.detalle ?? "",
      buyerName: pedido?.buyer_name ?? "",
      pedidoStatus: pedido?.status ?? "",
      mensajes: mapearMensajes(rows as unknown as Array<Record<string, unknown>>),
    };
  });

/** Lado comprador (sin sesión): manda una oferta o consulta al vendedor. */
export const enviarMensajeComprador = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MensajeCompradorInput.parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await autorizarComprador(data.cotizacionId, data.cancellationToken);
    const { data: c, error } = await supabaseAdmin
      .from("cotizaciones")
      .select("id, status, supplier_id, pedido_id, pedidos(status, detalle, buyer_name)")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("No encontramos esta negociación");

    const pedido = Array.isArray(c.pedidos) ? c.pedidos[0] : c.pedidos;
    if (pedido?.status === "desistido") throw new Error("El pedido está cerrado.");
    if (ESTADOS_CERRADOS.has(c.status)) throw new Error("Esta negociación ya está cerrada.");

    const { data: mensaje, error: insErr } = await supabaseAdmin
      .from("regateo_mensajes")
      .insert({
        cotizacion_id: c.id,
        pedido_id: c.pedido_id,
        autor: "comprador",
        tipo: data.tipo,
        texto: data.texto,
        precio: data.precio ?? null,
      })
      .select("id")
      .single();
    if (insErr || !mensaje) throw new Error(`No pudimos mandar tu oferta: ${insErr?.message ?? ""}`);

    // Aviso al vendedor (con tope de 1 correo por minuto para no bombardearlo).
    try {
      const { data: prev } = await supabaseAdmin
        .from("regateo_mensajes")
        .select("created_at")
        .eq("cotizacion_id", c.id)
        .eq("autor", "comprador")
        .neq("id", mensaje.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const haceMenosDeUnMinuto =
        prev && Date.now() - new Date(prev.created_at).getTime() < 60_000;
      if (!haceMenosDeUnMinuto && c.supplier_id) {
        const { data: s } = await supabaseAdmin
          .from("suppliers")
          .select("name, phone, owner_id")
          .eq("id", c.supplier_id)
          .maybeSingle();
        if (s?.owner_id) {
          const { data: user } = await supabaseAdmin.auth.admin.getUserById(s.owner_id);
          if (user?.user?.email) {
            const origin = new URL(getRequest().url).origin;
            const requestUrl = `${origin}/vendedores/pedido/${c.id}`;
            const digits = (s.phone ?? "").replace(/\D/g, "");
            const whatsappUrl = digits
              ? `https://wa.me/${digits.startsWith("54") ? digits : `549${digits.replace(/^9/, "")}`}`
              : undefined;
            const detalle = pedido?.detalle ?? "";
            await sendTemplateEmail("regateo-mensaje", user.user.email, {
              templateData: {
                vendorName: s.name ?? "Vendedor",
                buyerName: pedido?.buyer_name || "Un cliente",
                productSummary: detalle.length > 100 ? `${detalle.slice(0, 100)}…` : detalle,
                requestUrl,
                whatsappUrl,
              },
              idempotencyKey: `regateo-${mensaje.id}`,
            });
          }
        }
      }
    } catch (e) {
      console.error("Error notificando al vendedor del regateo", e instanceof Error ? e.message : e);
    }

    return { ok: true };
  });

/** Lado vendedor (con sesión): lee la conversación de su comercio. */
export const leerRegateoVendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CotizacionInput.parse(input))
  .handler(async ({ data, context }): Promise<EstadoRegateo> => {
    const { data: c, error } = await context.supabase
      .from("cotizaciones")
      .select("id, status, precio, pedidos(status, detalle, buyer_name)")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("No encontramos esta negociación");

    const pedido = Array.isArray(c.pedidos) ? c.pedidos[0] : c.pedidos;
    const { data: rows, error: mErr } = await context.supabase
      .from("regateo_mensajes")
      .select("id, autor, tipo, texto, precio, fotos, created_at")
      .eq("cotizacion_id", data.cotizacionId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);

    return {
      status: c.status,
      precioAcordado: c.status === "acordado" && c.precio !== null ? Number(c.precio) : null,
      detalle: pedido?.detalle ?? "",
      buyerName: pedido?.buyer_name ?? "",
      pedidoStatus: pedido?.status ?? "",
      mensajes: mapearMensajes(rows as unknown as Array<Record<string, unknown>>),
    };
  });

/** Lado vendedor (con sesión): responde con contraoferta, texto y fotos. */
export const responderRegateoVendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MensajeVendedorInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("cotizaciones")
      .select("id, status, pedido_id, precio")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("No encontramos esta negociación");
    if (ESTADOS_CERRADOS.has(c.status)) throw new Error("Esta negociación ya está cerrada.");

    const { error: insErr } = await context.supabase.from("regateo_mensajes").insert({
      cotizacion_id: c.id,
      pedido_id: c.pedido_id,
      autor: "vendedor",
      tipo: "oferta",
      texto: data.texto,
      precio: data.precio ?? null,
      fotos: data.fotos,
    });
    if (insErr) throw new Error(`No pudimos mandar tu respuesta: ${insErr.message}`);

    if (c.status === "pendiente" && data.precio) {
      const { error: upErr } = await context.supabase
        .from("cotizaciones")
        .update({ status: "cotizado", precio: data.precio, responded_at: new Date().toISOString() })
        .eq("id", c.id);
      if (upErr) throw new Error(upErr.message);
    }
    return { ok: true };
  });

/** Lado vendedor (con sesión): cierra el regateo con trato hecho o desistiendo. */
export const cerrarRegateoVendedor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CerrarRegateoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("cotizaciones")
      .select("id, status, pedido_id, precio")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) throw new Error("No encontramos esta negociación");
    if (ESTADOS_CERRADOS.has(c.status)) throw new Error("Esta negociación ya está cerrada.");

    if (data.decision === "trato") {
      const { data: ult } = await context.supabase
        .from("regateo_mensajes")
        .select("precio")
        .eq("cotizacion_id", c.id)
        .eq("autor", "comprador")
        .not("precio", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const precio = ult?.precio !== null && ult?.precio !== undefined ? Number(ult.precio) : null;
      if (!precio) throw new Error("El comprador todavía no ofreció un precio.");

      const { error: insErr } = await context.supabase.from("regateo_mensajes").insert({
        cotizacion_id: c.id,
        pedido_id: c.pedido_id,
        autor: "vendedor",
        tipo: "oferta",
        texto: `Dale, trato hecho por $${precio}.`,
        precio,
      });
      if (insErr) throw new Error(insErr.message);
      return { ok: true, trato: precio };
    }

    const { error: upErr } = await context.supabase
      .from("cotizaciones")
      .update({ status: "cerrado_vendedor", responded_at: new Date().toISOString() })
      .eq("id", c.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true };
  });

export const leerOfertasComprador = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ pedidoId: z.string().uuid(), cancellationToken: z.string().min(64).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = await cancellationTokenHash(data.cancellationToken);
    const { data: pedido } = await supabaseAdmin.from("pedidos").select("id, detalle").eq("id", data.pedidoId).eq("cancellation_token_hash", hash).maybeSingle();
    if (!pedido) throw new Error("No tenés acceso a este pedido");
    const { data: rows, error } = await supabaseAdmin.from("cotizaciones").select("id, precio, entrega, foto_url, status").eq("pedido_id", pedido.id).in("status", ["cotizado", "acordado"]).order("created_at");
    if (error) throw new Error("No pudimos leer las ofertas");
    return (rows ?? []).filter(c => c.precio !== null).map(c => ({ cotizacionId: c.id, producto: pedido.detalle, precio: Number(c.precio), entrega: c.entrega ?? "", ...(c.foto_url ? { imageUrl: c.foto_url } : {}) }));
  });

export const cerrarRegateoComprador = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CompradorInput.extend({ decision: z.enum(["trato", "desisto"]), comprarInicial: z.boolean().default(false) }).parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await autorizarComprador(data.cotizacionId, data.cancellationToken);
    const { data: c } = await supabaseAdmin.from("cotizaciones").select("status, precio").eq("id", data.cotizacionId).single();
    if (!c || ESTADOS_CERRADOS.has(c.status)) throw new Error("Esta negociación ya está cerrada");
    let precio = c.precio;
    if (data.decision === "trato" && !data.comprarInicial) {
      const { data: ultimo } = await supabaseAdmin.from("regateo_mensajes").select("precio").eq("cotizacion_id", data.cotizacionId).eq("autor", "vendedor").not("precio", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      precio = ultimo?.precio ?? null;
    }
    if (data.decision === "trato" && !precio) throw new Error("Esperá una propuesta del vendedor");
    const { error } = await supabaseAdmin.from("cotizaciones").update({ status: data.decision === "trato" ? "acordado" : "desistido", ...(data.decision === "trato" ? { precio } : {}) }).eq("id", data.cotizacionId).eq("status", c.status).select("id").single();
    if (error) throw new Error("No pudimos cerrar la negociación");
    return { precio: Number(precio ?? 0) };
  });
