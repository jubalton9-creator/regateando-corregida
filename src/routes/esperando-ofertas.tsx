import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { ResultadoDialog, type Resultado } from "@/components/ResultadoDialog";
import { analizarPedido } from "@/lib/match.functions";
import { crearPedido, desistirPedido } from "@/lib/pedidos.functions";
import { useQuery } from "@tanstack/react-query";
import { leerOfertasComprador } from "@/lib/regateo.functions";
import { Input } from "@/components/ui/input";
import collageAsset from "@/assets/collage-productos.png.asset.json";

const TOTAL_SECONDS = 15 * 60;

export const Route = createFileRoute("/esperando-ofertas")({
  head: () => ({
    meta: [
      { title: "Buscando ofertas — Regateando" },
      {
        name: "description",
        content: "Esperá las mejores ofertas de los comercios cercanos.",
      },
      { property: "og:title", content: "Buscando ofertas — Regateando" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Esperá las mejores ofertas de los comercios cercanos.",
      },
    ],
  }),
  component: EsperandoOfertas,
});

type PendingRequest = {
  detalle: string;
  fotos: string[];
  startTime: number;
  buyerName?: string;
  pedidoId?: string;
  cancellationToken?: string;
};

type OfertaRecibida = {
  id: string;
  alias: string;
  delivery: string;
  price: number;
  llegada: number; // segundos transcurridos desde inicio
};

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function useCountdown(startTime: number) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, TOTAL_SECONDS - elapsed);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setSecondsLeft(Math.max(0, TOTAL_SECONDS - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return secondsLeft;
}

function EsperandoOfertas() {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [ofertas, setOfertas] = useState<OfertaRecibida[]>([]);
  const enviarPedido = useServerFn(analizarPedido);
  const enviarPedidoReal = useServerFn(crearPedido);
  const cancelarPedido = useServerFn(desistirPedido);
  const [desistiendo, setDesistiendo] = useState(false);
  const [nombrePendiente, setNombrePendiente] = useState("");
  const cancelRequestedRef = useRef(false);
  const creationRef = useRef<Promise<{ pedidoId: string; cancellationToken: string; comercios: number }> | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("regateando-pending-request");
    if (raw) {
      try {
        setRequest(JSON.parse(raw));
      } catch {
        setRequest(null);
      }
    }
  }, []);

  const secondsLeft = useCountdown(request?.startTime ?? Date.now());

  const leerOfertas = useServerFn(leerOfertasComprador);
  const { data: ofertasReales, refetch: actualizarOfertas } = useQuery({
    queryKey: ["ofertas-comprador", request?.pedidoId],
    queryFn: () => leerOfertas({ data: { pedidoId: request?.pedidoId ?? "", cancellationToken: request?.cancellationToken ?? "" } }),
    enabled: !!request?.pedidoId && !!request?.cancellationToken,
    refetchInterval: 2000,
  });
  useEffect(() => {
    if (!ofertasReales) return;
    setResultado({ encontrado: ofertasReales.length > 0, mensaje: "Ofertas de los comercios", ofertas: ofertasReales });
    setOfertas(ofertasReales.map((o, i) => ({ id: o.cotizacionId, alias: `Proveedor #${i + 1}`, delivery: o.entrega, price: o.precio, llegada: 0 })));
  }, [ofertasReales]);

  useEffect(() => {
    if (!request?.buyerName || processedRef.current) return;
    processedRef.current = true;
    if (request.pedidoId && request.cancellationToken) {
      setDone(true);
      return;
    }
    setProcessing(true);

    enviarPedido({ data: { detalle: request.detalle, fotos: request.fotos } })
      .then((res) => {

        const proveedorIds = res.ofertas
          .map((o) => o.proveedorId ?? "")
          .filter(Boolean);
        const creation = enviarPedidoReal({
          data: { detalle: request.detalle, fotos: request.fotos, proveedorIds, buyerName: request.buyerName },
        });
        creationRef.current = creation;
        return creation;
      })
      .then(async ({ comercios, pedidoId, cancellationToken }) => {
        if (cancelRequestedRef.current) {
          await cancelarPedido({ data: { pedidoId, cancellationToken } });
          sessionStorage.removeItem("regateando-pending-request");
          setRequest(null);
          return;
        }
        const saved = { ...request, pedidoId, cancellationToken };
        sessionStorage.setItem("regateando-pending-request", JSON.stringify(saved));
        setRequest(saved);
        setDialogOpen(true);
        if (comercios > 0) {
          toast.success(
            `Le enviamos tu pedido a ${comercios} comercio${comercios > 1 ? "s" : ""}.`,
          );
        }
        setDone(true);
      })
      .catch((err) => {
        cancelRequestedRef.current = false;
        setDesistiendo(false);
        toast.error(
          err instanceof Error ? err.message : "No pudimos procesar tu pedido.",
        );
      })
      .finally(() => setProcessing(false));
  }, [request, enviarPedido, enviarPedidoReal, cancelarPedido]);

  async function desistir() {
    if (desistiendo) return;
    setDesistiendo(true);
    cancelRequestedRef.current = true;
    try {
      const credentials = request?.pedidoId && request.cancellationToken
        ? { pedidoId: request.pedidoId, cancellationToken: request.cancellationToken }
        : creationRef.current ? await creationRef.current : null;
      if (!credentials && processing) return; // creation continuation cancels before leaving
      if (credentials) await cancelarPedido({ data: credentials });
      sessionStorage.removeItem("regateando-pending-request");
      setDialogOpen(false);
      setResultado(null);
      toast.info("Desististe de la compra. La negociación quedó cerrada para ambos.");
      setRequest(null);
    } catch (error) {
      cancelRequestedRef.current = false;
      setDesistiendo(false);
      toast.error(error instanceof Error ? error.message : "No pudimos cerrar el pedido. Probá de nuevo.");
    }
  }

  const progress = secondsLeft / TOTAL_SECONDS;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (!request) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center px-5">
        <div className="relative z-10 max-w-md text-center">
          <h1 className="text-2xl font-bold">No hay pedido pendiente</h1>
          <p className="mt-2 text-muted-foreground">
            
          </p>
          
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5">
      {/* Fondo con collage de productos */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.15]"
        style={{
          backgroundImage: `url(${collageAsset.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Capa blanca sutil para legibilidad */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-white/85" />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        <div className="space-y-2">
          {request.buyerName ? <p className="text-xl font-semibold text-primary">{request.buyerName}, este es tu pedido</p> :
            <form className="flex flex-col gap-2" onSubmit={(event) => {
              event.preventDefault();
              if (!nombrePendiente.trim()) return;
              const saved = { ...request, buyerName: nombrePendiente.trim() };
              sessionStorage.setItem("regateando-pending-request", JSON.stringify(saved));
              setRequest(saved);
            }}>
              <label htmlFor="pending-name" className="text-sm font-medium">Tu nombre</label>
              <Input id="pending-name" required maxLength={150} value={nombrePendiente} onChange={(event) => setNombrePendiente(event.target.value)} />
              <Button type="submit">Continuar</Button>
            </form>}
          <h1 className="text-3xl font-bold tracking-tight">Buscando ofertas</h1>
          <p className="text-sm text-muted-foreground">Tu pedido está en la calle</p>
        </div>

        {/* Timer circular */}
        <div className="relative flex items-center justify-center">
          <svg width="280" height="280" className="-rotate-90">
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              className="text-muted/40"
            />
            <circle
              cx="140"
              cy="140"
              r={radius}
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-linear"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-bold tracking-tight tabular-nums">
              {formatTime(secondsLeft)}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              minutos
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-lg font-medium leading-relaxed text-foreground">
            Buscando las mejores ofertas en la calle...
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="text-sm text-muted-foreground">
              {processing
                ? "Analizando pedido"
                : done
                  ? "Pedido enviado a comercios"
                  : "Esperando ofertas"}
            </span>
          </div>
        </div>

        <div className="w-full rounded-xl border border-border bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Estás buscando:</p>
          <p className="mt-1 font-medium text-foreground">{request.detalle}</p>
          {request.fotos.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {request.fotos.length} foto{request.fotos.length > 1 ? "s" : ""} adjunta
              {request.fotos.length > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Ofertas recibidas en tiempo real */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Ofertas recibidas</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {ofertas.length}
            </span>
          </div>

          {ofertas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white/80 p-5 text-center">
              <p className="text-sm text-muted-foreground">
                Todavía no llegaron ofertas de los comercios.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ofertas.map((oferta) => (
                <div
                  key={oferta.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white/95 p-4 shadow-sm animate-in fade-in slide-in-from-bottom-3 duration-500"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">
                        {oferta.alias}
                      </p>
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {oferta.delivery}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold leading-none text-primary">
                      ${oferta.price.toLocaleString("es-AR")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">por unidad</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {resultado && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="h-14 w-full rounded-lg text-base font-semibold tracking-wide shadow-md"
          >
            Ver ofertas encontradas
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          disabled={desistiendo}
          onClick={desistir}
          className="h-12 w-full rounded-lg border-2 border-destructive text-base font-semibold text-destructive"
        >
          SALIR Y DETENER BÚSQUEDA
        </Button>

        
      </div>

      <ResultadoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resultado={resultado}
        buyerName={request.buyerName || ""}
        onDesistir={desistir}
        desistiendo={desistiendo}
        cancellationToken={request.cancellationToken}
        onCambio={() => { void actualizarOfertas(); }}
      />
    </main>
  );
}
