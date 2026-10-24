import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCatalog, getSuppliers } from "./catalog.server";

const MatchInput = z.object({
  detalle: z.string().min(1),
  fotos: z.array(z.string()).max(3).default([]),
});

export const analizarPedido = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Falta LOVABLE_API_KEY");

    const [catalog, suppliers] = await Promise.all([getCatalog(), getSuppliers()]);
    const catalogo = catalog
      .map(
        (p) =>
          `- id:${p.id} | ${p.nombre} | ${p.descripcion} | $${p.precio} | Vendedor: ${p.vendedor} (${p.zona}) | Stock: ${p.stock}`,
      )
      .join("\n");

    const comercios = suppliers
      .map((s) => `- id:sup:${s.id} | Rubro: ${s.categoria} | Zona: ${s.zona}`)
      .join("\n");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Pedido del cliente: "${data.detalle}"\n\nProductos disponibles en nuestra base de datos:\n${catalogo}\n\nComercios disponibles por rubro (usalos si ningún producto coincide):\n${comercios}`,
      },
    ];
    for (const foto of data.fotos) {
      content.push({ type: "image_url", image_url: { url: foto } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Sos el asistente de una app argentina de compra inversa. Compará el pedido del cliente (texto y fotos) con los productos de la base de datos. No inventes productos que no estén en la lista. IMPORTANTE: nunca reveles el nombre, la dirección ni la zona del vendedor: son datos privados hasta cerrar el trato. Devolvé entre 3 y 4 ofertas distintas (si hay menos productos que coincidan, variá precios y plazos de entrega de proveedores diferentes). Respondé SOLO un JSON con esta forma: {"encontrado": boolean, "mensaje": string (2 a 4 líneas en español rioplatense, cálido y directo, sin mencionar vendedores), "ofertas": [{"proveedorId": string (el id exacto del producto de la lista, campo id:), "producto": string, "precio": number, "entrega": string (plazo estimado de entrega, breve)}]}. Si NINGÚN producto de la lista coincide con el pedido, NO devuelvas ofertas=[]: elegí los comercios cuyo rubro corresponda al pedido (por ejemplo, clavos o herramientas -> Ferretería; heladera o lavarropas -> Electrodomésticos; pintura o rodillos -> Pinturería) y generá una oferta por comercio usando su id exacto con el prefijo sup: (campo id:sup:...), con un precio de mercado estimado y razonable en pesos argentinos para ese producto, y encontrado=true. En ese caso aclarále al cliente en el mensaje que son comercios del rubro que pueden conseguirlo y que el precio es estimado a confirmar. Solo si no hay ni productos ni comercios del rubro, encontrado=false y ofertas=[].',
          },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Demasiadas consultas. Probá de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error(`Error de IA [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";

    const Resultado = z.object({
      encontrado: z.boolean().default(false),
      mensaje: z.string().default(""),
      ofertas: z
        .array(
          z.object({
            proveedorId: z.string().default(""),
            producto: z.string(),
            precio: z.number().default(0),
            entrega: z.string().default(""),
            imageUrl: z.string().optional(),
          }),
        )
        .default([]),
    });

    try {
      const parsed = Resultado.parse(JSON.parse(raw.replace(/^```json|```$/g, "").trim()));
      // Enriquecemos cada oferta con la foto real del catálogo (simula que el vendedor la envió).
      const ofertasConFoto = parsed.ofertas.map((o) => {
        const item = catalog.find((p) => p.id === o.proveedorId);
        return { ...o, imageUrl: o.imageUrl || item?.imageUrl || "" };
      });
      return { ...parsed, ofertas: ofertasConFoto };
    } catch {
      return {
        encontrado: false,
        mensaje: raw || "No pudimos generar una respuesta. Intentá de nuevo.",
        ofertas: [] as Array<{
          proveedorId: string;
          producto: string;
          precio: number;
          entrega: string;
          imageUrl: string;
        }>,
      };
    }
  });
