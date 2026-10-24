import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { cancellationTokenHash } from "@/lib/pedido-state";

const CrearPedidoInput = z.object({
  detalle: z.string().min(1),
  fotos: z.array(z.string()).max(3).default([]),
  proveedorIds: z.array(z.string()).default([]),
  buyerName: z.string().max(150).default(""),
});

function toWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("54")) return digits;
  if (!digits.startsWith("9")) return `549${digits}`;
  return `54${digits}`;
}

function buildWhatsAppUrl(phone: string, vendorName: string, productSummary: string, url: string): string {
  const text = `Hola ${vendorName}, TE CONSULTAN POR: "${productSummary}". Si podés cotizarlo, entrá acá para ver el pedido y las fotos: ${url}`;
  return `https://wa.me/${toWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`;
}

function getOrigin(): string {
  try {
    const req = getRequest();
    if (req) return new URL(req.url).origin;
  } catch {
    // fallthrough
  }
  return process.env["REGATEANDO_ORIGIN"] || "https://regateando.online";
}

/**
 * Guarda el pedido del comprador y le deriva una solicitud de cotización
 * a cada comercio elegido por la IA (por rubro). El vendedor no carga
 * catálogo: solo responde si lo tiene y a qué precio.
 */
export const crearPedido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CrearPedidoInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Los ids pueden venir como "sup:<supplierId>" (comercio del rubro)
    // o como id de producto; en ese caso resolvemos su comercio.
    const supplierIds = new Set<string>();
    const productIds: string[] = [];
    for (const raw of data.proveedorIds) {
      if (!raw) continue;
      if (raw.startsWith("sup:")) supplierIds.add(raw.slice(4));
      else productIds.push(raw);
    }
    if (productIds.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("supplier_id")
        .in("id", productIds);
      for (const p of prods ?? []) if (p.supplier_id) supplierIds.add(p.supplier_id);
    }

    const cancellationToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await cancellationTokenHash(cancellationToken);
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .insert({ detalle: data.detalle, fotos: data.fotos, buyer_name: data.buyerName || null, cancellation_token_hash: tokenHash })
      .select("id")
      .single();
    if (error || !pedido) throw new Error(`No pudimos registrar el pedido: ${error?.message ?? ""}`);

    if (supplierIds.size > 0) {
      const rows = [...supplierIds].map((supplier_id) => ({ pedido_id: pedido.id, supplier_id }));
      const { data: cotizaciones, error: qErr } = await supabaseAdmin
        .from("cotizaciones")
        .insert(rows)
        .select("id, supplier_id");
      if (qErr) console.error("Error derivando cotizaciones:", qErr.message);

      const cotizacionPorSupplier = new Map<string, string>();
      for (const c of cotizaciones ?? []) {
        if (c.supplier_id) cotizacionPorSupplier.set(c.supplier_id, c.id);
      }

      // Notificamos a cada comercio por email (y dejamos un link de WhatsApp listo).
      const { data: suppliers } = await supabaseAdmin
        .from("suppliers")
        .select("id, name, phone, owner_id")
        .in("id", [...supplierIds]);

      const origin = getOrigin();
      const productSummary = data.detalle.length > 100 ? `${data.detalle.slice(0, 100)}…` : data.detalle;

      for (const s of suppliers ?? []) {
        if (!s.owner_id) continue;
        const cotizacionId = cotizacionPorSupplier.get(s.id);
        const requestUrl = cotizacionId
          ? `${origin}/vendedores/pedido/${cotizacionId}`
          : `${origin}/cotizar`;
        try {
          const { data: user, error: userErr } = await supabaseAdmin.auth.admin.getUserById(s.owner_id);
          if (userErr || !user?.user?.email) {
            console.warn("No se pudo obtener email del dueño del comercio", s.id, userErr?.message);
            continue;
          }

          const whatsappUrl = s.phone
            ? buildWhatsAppUrl(s.phone, s.name, productSummary, requestUrl)
            : undefined;

          await sendTemplateEmail("new-request", user.user.email, {
            templateData: {
              vendorName: s.name,
              buyerName: data.buyerName || "Un cliente",
              productSummary,
              requestUrl,
              whatsappUrl,
            },
            idempotencyKey: `new-request-${pedido.id}-${s.id}`,
          });
        } catch (e) {
          console.error("Error notificando al vendedor", s.id, e instanceof Error ? e.message : e);
        }
      }
    }

    return { pedidoId: pedido.id, cancellationToken, comercios: supplierIds.size };
  });

/** A request-specific secret allows cancellation after the buyer session is cleared. */
export const desistirPedido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    pedidoId: z.string().uuid(),
    cancellationToken: z.string().min(64).max(100),
  }).parse(input))
  .handler(async ({ data }) => {
    const hash = await cancellationTokenHash(data.cancellationToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin.from("pedidos")
      .update({ status: "desistido" })
      .eq("id", data.pedidoId).eq("cancellation_token_hash", hash)
      .select("id").maybeSingle();
    if (error || !pedido) throw new Error("No pudimos cerrar el pedido. Probá de nuevo.");
    return { ok: true };
  });

/** Bandeja del vendedor: pedidos que la IA le derivó por rubro. */
export const misSolicitudes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cotizaciones")
      .select("id, status, precio, entrega, mensaje, created_at, pedidos(detalle, fotos, created_at, buyer_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (data ?? []).map((c) => {
      const pedido = Array.isArray(c.pedidos) ? c.pedidos[0] : c.pedidos;
      return {
        id: c.id,
        status: c.status,
        precio: c.precio,
        entrega: c.entrega ?? "",
        mensaje: c.mensaje ?? "",
        detalle: pedido?.detalle ?? "",
        buyerName: pedido?.buyer_name ?? "",
        fotos: (pedido?.fotos ?? []) as string[],
        createdAt: c.created_at,
      };
    });
  });

const ResponderInput = z.object({
  cotizacionId: z.string().uuid(),
  tiene: z.boolean(),
  precio: z.number().int().nonnegative().optional(),
  entrega: z.string().max(120).optional(),
  mensaje: z.string().max(500).optional(),
});

/** El vendedor responde: "lo tengo a $X" o "no lo tengo". */
export const responderSolicitud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ResponderInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("cotizaciones")
      .update({
        status: data.tiene ? "cotizado" : "no_tengo",
        precio: data.tiene ? (data.precio ?? null) : null,
        entrega: data.tiene ? (data.entrega ?? null) : null,
        mensaje: data.mensaje ?? null,
        responded_at: new Date().toISOString(),
      })
      .eq("id", data.cotizacionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SolicitudInput = z.object({ cotizacionId: z.string().uuid() });

/** Detalle de una solicitud puntual (la que se abre desde el mail/WhatsApp). */
export const verSolicitud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SolicitudInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: c, error } = await context.supabase
      .from("cotizaciones")
      .select("id, status, precio, entrega, mensaje, created_at, pedidos(detalle, fotos, created_at, buyer_name)")
      .eq("id", data.cotizacionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return null;

    const pedido = Array.isArray(c.pedidos) ? c.pedidos[0] : c.pedidos;
    return {
      id: c.id,
      status: c.status,
      precio: c.precio,
      entrega: c.entrega ?? "",
      mensaje: c.mensaje ?? "",
      detalle: pedido?.detalle ?? "",
      buyerName: pedido?.buyer_name ?? "",
      fotos: (pedido?.fotos ?? []) as string[],
      createdAt: c.created_at,
    };
  });
