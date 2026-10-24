import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCatalog } from "./catalog.server";
import { createLovableAiGatewayRunIdFetch } from "./lovable-aig-run-id";

const NegociarInput = z.object({
  producto: z.string().min(1),
  proveedorId: z.string().default(""),
  vendedor: z.string().default(""),
  precioLista: z.number(),
  precioOfrecido: z.number(),
  mensajeCliente: z.string().default(""),
  ronda: z.number().default(1),
});

export type RespuestaNegociacion = {
  decision: "acepta" | "contraoferta" | "rechaza";
  precioFinal: number;
  mensaje: string;
};

export const negociarOferta = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => NegociarInput.parse(input))
  .handler(async ({ data }): Promise<RespuestaNegociacion> => {
    // La negociación se dirige al proveedor real de esa oferta (dato privado, no se expone al cliente).
    const catalog = await getCatalog();
    const proveedor = catalog.find((p) => p.id === data.proveedorId);
    const vendedorReal = proveedor?.vendedor || data.vendedor || "Vendedor";
    // Si la oferta viene de un comercio del rubro (sin producto en catálogo), usamos el precio estimado.
    const precioLista = proveedor?.precio ?? data.precioLista;
    const stock = proveedor?.stock ?? 1;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");

    // Reglas de negocio deterministas: el vendedor NO acepta en la primera ronda
    // si el cliente ofrece por debajo del precio de lista; hace una contraoferta.
    const minimo = Math.round(precioLista * 0.85);
    const ofrecido = data.precioOfrecido;
    let decision: RespuestaNegociacion["decision"];
    let precioFinal: number;

    if (ofrecido >= precioLista) {
      decision = "acepta";
      precioFinal = precioLista;
    } else if (ofrecido < Math.round(precioLista * 0.5)) {
      decision = "rechaza";
      precioFinal = minimo;
    } else if (data.ronda >= 3 && ofrecido >= minimo) {
      decision = "acepta";
      precioFinal = ofrecido;
    } else {
      decision = "contraoferta";
      // punto intermedio entre lo ofrecido y el precio de lista, nunca por debajo del mínimo
      const medio = Math.round((ofrecido + precioLista) / 2);
      precioFinal = Math.max(minimo, Math.min(medio, precioLista - 1));
      if (precioFinal <= ofrecido) {
        decision = "acepta";
        precioFinal = ofrecido;
      }
    }

    const instruccion =
      decision === "acepta"
        ? `Aceptás la oferta del cliente por $${precioFinal}. Agradecé y confirmá la reserva.`
        : decision === "rechaza"
          ? `Rechazás con amabilidad porque es muy bajo, y comentás que tu piso está cerca de $${precioFinal}.`
          : `NO aceptás su oferta: hacés una CONTRAOFERTA de $${precioFinal}. Explicá brevemente por qué ese es un buen precio e invitá a cerrar.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Sos un vendedor argentino negociando en una app de compra inversa. Escribí 1 a 3 líneas en español rioplatense, cordial y directo. No menciones tu nombre, tu local ni la dirección. No inventes otros precios: usá solo el precio indicado. Respondé solo el texto del mensaje.",
          },
          {
            role: "user",
            content: `Producto: ${proveedor?.nombre || data.producto}\nStock disponible: ${stock}\nRonda de negociación: ${data.ronda}\nEl cliente ofrece: $${ofrecido}\nMensaje del cliente: "${data.mensajeCliente}"\nInstrucción: ${instruccion}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Demasiadas consultas. Probá de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error(`Error de IA [${res.status}]`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";

    const fallback =
      decision === "acepta"
        ? `¡Dale, cerramos por $${precioFinal}! Te lo reservo ahora mismo.`
        : decision === "rechaza"
          ? `Uf, así no me da. Mi piso está cerca de $${precioFinal}.`
          : `No llego a ese número, pero te lo dejo en $${precioFinal}. ¿Cerramos?`;

    return { decision, precioFinal, mensaje: raw || fallback };
  });

export type RespuestaConsulta = {
  mensaje: string;
  articulo?: string;
  precio?: number;
};

const ConsultaExtraInput = z.object({
  productoOriginal: z.string().min(1),
  consulta: z.string().min(1),
});

export const consultarOtroProducto = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConsultaExtraInput.parse(input))
  .handler(async ({ data }): Promise<RespuestaConsulta> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayRunIdFetch();
    const res = await gateway.fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: [
          {
            role: "system",
            content:
              "Sos un vendedor argentino. El cliente que ya está negociando un producto te consulta por OTRO producto para sumar al mismo pedido. Respondé en 1 a 3 líneas, en español rioplatense, cordial y directo: decí si tenés ese producto o algo similar, y dale un precio en pesos argentinos coherente. Si no lo tenés, ofrecé una alternativa con su precio. Terminá SIEMPRE con dos líneas finales exactas, en este orden: ARTICULO: <nombre corto del producto que ofrecés, 2 a 5 palabras, sin frases ni signos de interrogación> y debajo PRECIO: <número sin puntos ni símbolos> si le podés vender algo, o PRECIO: - si no hay nada para ofrecerle.",
          },
          {
            role: "user",
            content: `Producto original del pedido: ${data.productoOriginal}\nConsulta del cliente: "${data.consulta}"`,
          },
        ],
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("Demasiadas consultas. Probá de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error(`Error de IA [${res.status}]`);
    }

    const body = res.body;
    if (!body) throw new Error("Respuesta vacía de la IA");
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let raw = "";
    let fallo = false;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let salto: number;
      while ((salto = buffer.indexOf("\n")) >= 0) {
        const linea = buffer.slice(0, salto).trim();
        buffer = buffer.slice(salto + 1);
        if (!linea.startsWith("data:")) continue;
        const payload = linea.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) raw += ev.delta;
          if (ev.type === "response.failed" || ev.type === "error") fallo = true;
        } catch {
          // línea no JSON: se ignora
        }
      }
    }
    if (fallo) throw new Error("La IA no pudo responder la consulta. Probá de nuevo.");

    const match = raw.match(/PRECIO:\s*([0-9][0-9.,]*)/i);
    const parsed = match
      ? Math.round(Number((match[1] ?? "").replace(/\./g, "").replace(",", ".")))
      : undefined;
    const precio = typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;

    // El vendedor también devuelve el nombre corto del artículo, para la factura del pedido.
    const artMatch = raw.match(/ARTICULO:\s*(.+)/i);
    const articulo = artMatch?.[1]?.replace(/["'“”]/g, "").trim().replace(/\.$/, "").slice(0, 60) || undefined;

    const limpio = raw.replace(/ARTICULO:.*$/im, "").replace(/PRECIO:.*$/im, "").trim();
    const mensaje = limpio || raw.trim() || "El vendedor no respondió la consulta. Probá de nuevo.";

    return { mensaje, ...(articulo ? { articulo } : {}), ...(precio !== undefined ? { precio } : {}) };
  });
