import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { RequestPhotos } from "@/components/RequestPhotos";
import { leerRegateoComprador, leerRegateoVendedor, enviarMensajeComprador, responderRegateoVendedor, cerrarRegateoComprador, cerrarRegateoVendedor } from "@/lib/regateo.functions";
import { REGATEO_SEGUNDOS, regateoCerrado } from "@/lib/regateo-state";

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
type Props = { cotizacionId: string; producto: string; precioInicial: number; lado: "comprador" | "vendedor"; cancellationToken?: string | undefined; onCambio?: (() => void) | undefined };

export function RegateoPanel({ cotizacionId, producto, precioInicial, lado, cancellationToken, onCambio }: Props) {
  const comprador = lado === "comprador";
  const leerComprador = useServerFn(leerRegateoComprador);
  const leerVendedor = useServerFn(leerRegateoVendedor);
  const enviarComprador = useServerFn(enviarMensajeComprador);
  const enviarVendedor = useServerFn(responderRegateoVendedor);
  const cerrarComprador = useServerFn(cerrarRegateoComprador);
  const cerrarVendedor = useServerFn(cerrarRegateoVendedor);
  const [abierto, setAbierto] = useState(!comprador);
  const [precio, setPrecio] = useState("");
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [restante, setRestante] = useState(REGATEO_SEGUNDOS);
  const [fin, setFin] = useState<number | null>(null);
  const { data, error, refetch } = useQuery({
    queryKey: ["regateo", lado, cotizacionId],
    queryFn: () => comprador ? leerComprador({ data: { cotizacionId, cancellationToken: cancellationToken ?? "" } }) : leerVendedor({ data: { cotizacionId } }),
    enabled: !comprador || !!cancellationToken,
    refetchInterval: 2000,
  });
  const cerrado = regateoCerrado(data?.status ?? "") || data?.pedidoStatus === "desistido";
  const mensajes = data?.mensajes ?? [];
  const recibida = [...mensajes].reverse().find(m => m.autor !== lado && m.precio !== null);
  useEffect(() => {
    if (comprador || fin || !mensajes.length) return;
    const primero = mensajes.find(m => m.autor === "comprador");
    if (primero) setFin(new Date(primero.createdAt).getTime() + REGATEO_SEGUNDOS * 1000);
  }, [comprador, fin, mensajes]);
  useEffect(() => {
    if (!fin || cerrado) return;
    const tick = () => setRestante(Math.max(0, Math.ceil((fin - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [fin, cerrado]);

  async function enviar() {
    const valor = Number(precio);
    if (!valor && !texto.trim() && !fotos.length) { toast.error("Poné tu propuesta o escribí un mensaje"); return; }
    setOcupado(true);
    try {
      if (comprador) {
        await enviarComprador({ data: { cotizacionId, cancellationToken: cancellationToken ?? "", texto, tipo: valor ? "oferta" : "consulta", ...(valor > 0 ? { precio: Math.round(valor) } : {}) } });
      } else {
        const imagenes = await Promise.all(fotos.map(file => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("No pudimos leer la foto"));
          reader.onerror = () => reject(new Error("No pudimos leer la foto"));
          reader.readAsDataURL(file);
        })));
        await enviarVendedor({ data: { cotizacionId, texto, fotos: imagenes, ...(valor > 0 ? { precio: Math.round(valor) } : {}) } });
      }
      setPrecio(""); setTexto(""); setFotos([]);
      await refetch(); onCambio?.();
      toast.success("Propuesta enviada");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No pudimos enviar"); }
    finally { setOcupado(false); }
  }

  async function cerrar(decision: "trato" | "desisto", comprarInicial = false) {
    setOcupado(true);
    try {
      if (comprador) {
        await cerrarComprador({ data: { cotizacionId, cancellationToken: cancellationToken ?? "", decision, comprarInicial } });
      } else await cerrarVendedor({ data: { cotizacionId, decision } });
      await refetch(); onCambio?.();
      toast.success(decision === "trato" ? (comprador ? "Trato hecho" : "Le confirmaste su precio al comprador") : "Negociación cerrada");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No pudimos cerrar"); }
    finally { setOcupado(false); }
  }

  return <section className="mt-3 space-y-4 border-t border-border pt-4">
    {comprador && !abierto && !cerrado && <div className="grid grid-cols-2 gap-2">
      <Button disabled={ocupado} onClick={() => void cerrar("trato", true)}>Comprar ya</Button>
      <Button variant="outline" onClick={() => { setAbierto(true); setFin(Date.now() + REGATEO_SEGUNDOS * 1000); }}>Negociar</Button>
    </div>}
    {(abierto || cerrado) && <>
      <div className="border-b border-border pb-3">
        <h2 className="text-sm font-bold uppercase text-primary">Detalle del pedido</h2>
        <div className="mt-2 flex justify-between gap-3 text-sm"><span className="min-w-0 break-words">{producto}</span><strong className="shrink-0">{money.format(precioInicial)}</strong></div>
      </div>
      <h2 className="text-center text-lg font-extrabold uppercase text-primary">Regateando</h2>
      {fin && !cerrado && <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-primary bg-primary/10 p-3">
        <p className="text-xs font-bold text-primary">{restante ? "El regateo termina en 3 minutos" : "Negociación cerrada"}</p>
        <strong className={restante <= 30 ? "text-2xl tabular-nums text-destructive" : "text-2xl tabular-nums text-primary"}>{Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}</strong>
      </div>}
      <div aria-live="polite" className="space-y-2">
        {mensajes.map(m => <div key={m.id} className={`max-w-[90%] rounded-lg p-3 text-sm ${m.autor === lado ? "ml-auto bg-primary/10" : "bg-muted"}`}>
          <p className="text-xs font-semibold text-muted-foreground">{m.autor === lado ? "Vos" : comprador ? "Comercio" : data?.buyerName || "Comprador"}</p>
          {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
          {m.precio !== null && <strong>{money.format(m.precio)}</strong>}
          <div className="mt-2 flex flex-wrap gap-2">{m.fotos.map((foto, i) => <Button key={i} variant="ghost" className="size-20 cursor-pointer p-0" aria-label={`Ampliar foto recibida ${i + 1}`} onClick={() => setAmpliada(foto)}><img src={foto} alt="Producto ofrecido" className="size-full rounded-lg object-cover" /></Button>)}</div>
        </div>)}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      {cerrado ? <p className="bg-muted p-3 text-center font-semibold">{data?.status === "acordado" ? "Trato hecho" : "Negociación cerrada"}</p> : restante > 0 && <>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor={`${lado}-recibir`}>Recibir contraoferta</Label><Input id={`${lado}-recibir`} readOnly value={recibida?.precio ? money.format(recibida.precio) : "—"} /></div>
          <div className="space-y-2"><Label htmlFor={`${lado}-enviar`}>Enviar contraoferta</Label><Input id={`${lado}-enviar`} type="number" min="1" inputMode="numeric" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Tu número" /></div>
        </div>
        <Label htmlFor={`${lado}-mensaje`}>Mensaje y entrega</Label>
        <Input id={`${lado}-mensaje`} maxLength={500} value={texto} onChange={e => setTexto(e.target.value)} placeholder="Precio, forma y tiempo de entrega" />
        {!comprador && <RequestPhotos photos={fotos} onChange={setFotos} />}
        <Button className="w-full" disabled={ocupado || !data} onClick={() => void enviar()}>{ocupado ? "Enviando…" : "Enviar propuesta"}</Button>
        <Button className="w-full" disabled={ocupado || !recibida?.precio} onClick={() => void cerrar("trato")}>TRATO HECHO{recibida?.precio ? ` · ${money.format(recibida.precio)}` : ""}</Button>
      </>}
      {!cerrado && restante <= 0 && comprador && <Button className="w-full" disabled={ocupado} onClick={() => void cerrar("trato", true)}>Comprar al precio inicial · {money.format(precioInicial)}</Button>}
    </>}
    {!cerrado && <Button className="w-full" variant="destructive" disabled={ocupado || !data} onClick={() => void cerrar("desisto")}>DESISTO</Button>}
    <Dialog open={!!ampliada} onOpenChange={open => { if (!open) setAmpliada(null); }}><DialogContent aria-describedby={undefined}><DialogTitle>Foto del producto</DialogTitle>{ampliada && <img src={ampliada} alt="Producto ampliado" className="max-h-[70dvh] w-full object-contain" />}</DialogContent></Dialog>
  </section>;
}