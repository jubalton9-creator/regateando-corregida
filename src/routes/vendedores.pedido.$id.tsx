import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";
import { verSolicitud, responderSolicitud } from "@/lib/pedidos.functions";
import { RegateoPanel } from "@/components/RegateoPanel";
import { pedidoDesistido } from "@/lib/pedido-state";

export const Route = createFileRoute("/vendedores/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Te consultan por un producto — Regateando" },
      {
        name: "description",
        content:
          "Mirá el detalle del pedido y las fotos del cliente, y respondé con tu precio y plazo de entrega.",
      },
      { property: "og:title", content: "Te consultan por un producto — Regateando" },
      {
        property: "og:description",
        content: "Cotizá el pedido de un comprador en Regateando en menos de un minuto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoDetalle,
});

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

function PedidoDetalle() {
  const { id } = Route.useParams();
  const { user, loading } = useSession();
  const fetchSolicitud = useServerFn(verSolicitud);
  const responder = useServerFn(responderSolicitud);
  const queryClient = useQueryClient();

  const [precio, setPrecio] = useState("");
  const [entrega, setEntrega] = useState("");
  const [mensaje, setMensaje] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["solicitud", id],
    queryFn: () => fetchSolicitud({ data: { cotizacionId: id } }),
    enabled: !!user,
    refetchInterval: 2000,
  });

  const mutation = useMutation({
    mutationFn: responder,
    onSuccess: () => {
      toast.success("¡Listo! Le mandamos tu respuesta al comprador.");
      queryClient.invalidateQueries({ queryKey: ["solicitud", id] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "No pudimos enviar tu respuesta."),
  });

  if (loading) return null;

  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
        <h1 className="text-2xl font-bold">Te consultan por un producto</h1>
        <p className="text-muted-foreground">
          Ingresá con tu cuenta de comercio para ver el pedido y las fotos del cliente.
        </p>
        
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-10 text-muted-foreground">Cargando pedido…</main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-10 text-center">
        <h1 className="text-xl font-bold">No encontramos este pedido</h1>
        <p className="text-muted-foreground">
          Puede que ya no esté disponible o que corresponda a otro comercio.
        </p>
        
      </main>
    );
  }

  const respondida = data.status !== "pendiente";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-5 px-5 py-8">
      <header className="flex items-center justify-between">
        
        <span className="text-xs text-muted-foreground">
          {new Date(data.createdAt).toLocaleString("es-AR")}
        </span>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Te consultan por
        </p>
        <h1 className="mt-1 text-xl font-bold text-primary">{data.detalle}</h1>
        {data.buyerName && <p className="mt-2 text-sm font-semibold">Pedido de {data.buyerName}</p>}

        {data.fotos.length > 0 && (
          <>
            <p className="mt-5 text-sm font-medium">Fotos que mandó el cliente</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {data.fotos.map((f, i) => (
                <img
                  key={i}
                  src={f}
                  alt={`Foto del producto buscado ${i + 1}`}
                  className="size-28 rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          </>
        )}
      </section>

      {data.status !== "pendiente" && data.status !== "no_tengo" && <RegateoPanel cotizacionId={data.id} lado="vendedor" producto={data.detalle} precioInicial={Number(data.precio ?? 0)} onCambio={() => { void queryClient.invalidateQueries({ queryKey: ["solicitud", id] }); }} />}
      {respondida ? (
        <p className="rounded-xl bg-muted p-4 text-sm">
          {pedidoDesistido(data.status) ? "El comprador desistió. Negociación cerrada." : data.status === "acordado" ? "Trato hecho con el comprador." : data.status === "cerrado_vendedor" ? "Desististe de esta negociación." : data.status === "cotizado"
            ? `Ya cotizaste ${data.precio ? money.format(data.precio) : "sin precio"}${
                data.entrega ? ` · Entrega: ${data.entrega}` : ""
              }`
            : "Respondiste que no lo tenés."}
        </p>
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm font-medium">¿Lo tenés? Pasá tu precio.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              inputMode="numeric"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Precio en pesos"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 focus:border-primary focus:outline-none"
            />
            <input
              type="text"
              value={entrega}
              onChange={(e) => setEntrega(e.target.value)}
              placeholder="Plazo de entrega (ej: 48 hs)"
              className="h-11 w-full rounded-lg border border-border bg-background px-3 focus:border-primary focus:outline-none"
            />
          </div>
          <input
            type="text"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Comentario para el comprador (opcional)"
            className="h-11 w-full rounded-lg border border-border bg-background px-3 focus:border-primary focus:outline-none"
          />
          <div className="flex gap-3">
            <Button
              type="button"
              disabled={mutation.isPending}
              className="flex-1"
              onClick={() => {
                const valor = Number(precio);
                if (!valor || valor <= 0) {
                  toast.error("Poné el precio para cotizar.");
                  return;
                }
                mutation.mutate({
                  data: {
                    cotizacionId: data.id,
                    tiene: true,
                    precio: Math.round(valor),
                    entrega,
                    mensaje,
                  },
                });
              }}
            >
              Sí, lo tengo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={mutation.isPending}
              className="flex-1"
              onClick={() =>
                mutation.mutate({ data: { cotizacionId: data.id, tiene: false, mensaje } })
              }
            >
              No lo tengo
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
