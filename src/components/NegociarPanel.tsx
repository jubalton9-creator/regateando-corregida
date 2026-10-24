import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { negociarOferta, consultarOtroProducto, type RespuestaNegociacion } from "@/lib/negociar.functions";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

type Mensaje = { de: "vos" | "vendedor"; texto: string; precio?: number };

type ExtraPedido = { descripcion: string; precio?: number };

type RespuestaVendedor = { mensaje: string; articulo?: string; precio?: number };

type Props = {
  producto: string;
  proveedorId: string;
  vendedor: string;
  precioLista: number;
};

const DURACION_NEGOCIACION = 3 * 60;

export function NegociarPanel({ producto, proveedorId, vendedor, precioLista }: Props) {
  const negociar = useServerFn(negociarOferta);
  const consultar = useServerFn(consultarOtroProducto);
  const [abierto, setAbierto] = useState(false);
  const [oferta, setOferta] = useState("");
  const [nota, setNota] = useState("");
  const [chat, setChat] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cerrado, setCerrado] = useState<RespuestaNegociacion | null>(null);
  const [mostrarConsulta, setMostrarConsulta] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [consultandoIA, setConsultandoIA] = useState(false);
  const [respuestaExtra, setRespuestaExtra] = useState<RespuestaVendedor | null>(null);
  const [extras, setExtras] = useState<ExtraPedido[]>([]);
  const [restante, setRestante] = useState(DURACION_NEGOCIACION);
  const [reinicio, setReinicio] = useState(0);
  const [precioBase, setPrecioBase] = useState(precioLista);
  const vencido = restante <= 0 && !cerrado;
  const sumaExtras = extras.reduce((acc, e) => acc + (e.precio ?? 0), 0);

  useEffect(() => {
    if (!abierto || cerrado || mostrarConsulta) return;
    const fin = Date.now() + restante * 1000;
    const t = window.setInterval(() => {
      const r = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
      setRestante(r);
      if (r <= 0) window.clearInterval(t);
    }, 250);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, cerrado, mostrarConsulta, reinicio]);

  const ronda = chat.filter((m) => m.de === "vos").length + 1;

  const ultimaOfertaMia = [...chat].reverse().find((m) => m.de === "vos" && m.precio)?.precio;
  const ultimaContra =
    !cerrado && chat.length > 0 && chat[chat.length - 1]?.de === "vendedor"
      ? chat[chat.length - 1]?.precio
      : undefined;
  const mitad =
    ultimaContra && ultimaOfertaMia
      ? Math.round((ultimaContra + ultimaOfertaMia) / 2)
      : undefined;

  function aceptarContra(precio: number) {
    setChat((c) => [...c, { de: "vos", texto: "Acepto tu precio.", precio }]);
    setCerrado({ decision: "acepta", precioFinal: precio, mensaje: "Trato cerrado" });

  }

  function agregarExtra(extra: ExtraPedido) {
    setExtras((prev) => [...prev, extra]);
    setPrecioBase((p) => p + (extra.precio ?? 0));
    setChat([]);
    setCerrado(null);
    setRestante(DURACION_NEGOCIACION);
    setReinicio((r) => r + 1);
    setRespuestaExtra(null);
    setConsulta("");
    setMostrarConsulta(false);
    toast.success("Producto agregado al pedido");
  }

  async function enviarConsulta() {
    const texto = consulta.trim();
    if (!texto) {
      toast.error("Escribí qué otro producto querés consultar");
      return;
    }
    setConsultandoIA(true);
    try {
      const r = await consultar({ data: { productoOriginal: producto, consulta: texto } });
      setRespuestaExtra({
        mensaje: r.mensaje,
        ...(r.articulo ? { articulo: r.articulo } : {}),
        ...(r.precio !== undefined ? { precio: r.precio } : {}),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al consultar");
    } finally {
      setConsultandoIA(false);
    }
  }

  async function enviarOferta(precioForzado?: number, notaForzada?: string) {
    const precio = precioForzado ?? Number(oferta.replace(/\D/g, ""));
    if (!precio) {
      toast.error("Poné cuánto querés pagar");
      return;
    }
    const mensaje = notaForzada ?? nota;
    setChat((c) => [...c, { de: "vos", texto: mensaje || "Te ofrezco:", precio }]);
    setCargando(true);
    try {
      const r = await negociar({
        data: {
          producto,
          proveedorId,
          vendedor,
          precioLista: precioBase,
          precioOfrecido: precio,
          mensajeCliente: mensaje,
          ronda,
        },
      });
      setChat((c) => [...c, { de: "vendedor", texto: r.mensaje, precio: r.precioFinal }]);
      setOferta("");
      setNota("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al negociar");
    } finally {
      setCargando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
      >
        Negociar con este proveedor
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-primary/40 bg-background p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Negociación</p>
      </div>

      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Detalle del pedido
        </p>
        <div className="mt-1 divide-y divide-border">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{producto}</span>
            <span className="shrink-0 text-sm font-bold tabular-nums">{money.format(precioLista)}</span>
          </div>
          {extras.map((e, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="min-w-0 flex-1 text-sm leading-snug text-muted-foreground">
                {e.descripcion}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                {e.precio ? money.format(e.precio) : "Sin precio"}
              </span>
            </div>
          ))}
          {extras.length > 0 && (
            <div className="flex items-baseline justify-between gap-3 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wide">Total</span>
              <span className="text-base font-extrabold tabular-nums">
                {money.format(precioBase)}
              </span>
            </div>
          )}
        </div>
      </div>

      {!cerrado && !vencido && mostrarConsulta && (
        <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs font-semibold">
          ⏸ Reloj en pausa mientras consultás otros artículos
        </p>
      )}

      {!cerrado && !vencido && (
        <div
          className={`flex items-center justify-between gap-2 rounded-lg border-2 px-3 py-2 ${
            restante <= 30 ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"
          }`}
        >
          <p
            className={`text-[11px] font-bold uppercase tracking-wide leading-tight ${
              restante <= 30 ? "text-destructive" : "text-primary"
            }`}
          >
            El regateo
            <br />
            termina en 3 minutos
          </p>
          <span
            className={`rounded-full px-3 py-1 text-2xl font-extrabold tabular-nums leading-none ${
              restante <= 30
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            ⏱ {Math.floor(restante / 60)}:{String(restante % 60).padStart(2, "0")}
          </span>
        </div>
      )}

      {chat.length > 0 && (
        <div className="space-y-2">
          {chat.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.de === "vos"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase opacity-70">
                {m.de === "vos" ? "Vos" : vendedor || "Vendedor"}
              </p>
              <p>{m.texto}</p>
              {m.precio ? <p className="mt-1 font-bold">{money.format(m.precio)}</p> : null}
            </div>
          ))}
        </div>
      )}

      {!cerrado && !vencido && ultimaContra && mitad && !cargando && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => aceptarContra(ultimaContra)}
            className="rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
          >
            Aceptar {money.format(ultimaContra)}
          </button>
          {mitad !== ultimaContra && <button
            type="button"
            onClick={() =>
              enviarOferta(mitad, `Partamos la diferencia: ${money.format(mitad)}`)
            }
            className="rounded-lg border-2 border-primary py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
          >
            Partamos la diferencia {money.format(mitad)}
          </button>}
        </div>
      )}

      {cerrado ? (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-3 text-center">
          <p className="text-sm font-bold uppercase text-primary">Trato cerrado</p>
          <p className="text-lg font-extrabold text-foreground">{money.format(cerrado.precioFinal)}</p>
        </div>
      ) : vencido ? (
        <div className="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-lg border-2 border-destructive bg-destructive/10 px-3 py-5 text-center">
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-[8deg] whitespace-nowrap rounded-md bg-destructive px-5 py-1.5 text-lg font-extrabold uppercase tracking-[0.15em] text-destructive-foreground shadow-lg">
              Negociación cerrada
            </span>
          </span>
          <p className="relative z-10 mx-auto w-fit rounded bg-background px-2 py-1 text-xs font-bold uppercase tracking-wide text-destructive">
            Se acabó el tiempo
          </p>
          <p className="relative z-10 mx-auto w-fit rounded bg-background px-2 py-1 text-xs text-foreground">
            Solo podés comprar al precio inicial de{" "}
            <span className="font-bold">{money.format(precioBase)}</span>.
          </p>
        </div>
      ) : (
        <>
          <input
            inputMode="numeric"
            value={oferta}
            onChange={(e) => setOferta(e.target.value)}
            placeholder="¿Cuánto querés pagar? Ej: 120000"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Mensaje para el vendedor (opcional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            disabled={cargando}
            onClick={() => enviarOferta()}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {cargando ? "Esperando al vendedor..." : "Enviar oferta"}
          </button>
        </>
      )}

      {!cerrado && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <button
            type="button"
            onClick={() => setMostrarConsulta((v) => !v)}
            className="w-full rounded-lg border-2 border-primary py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
          >
            {mostrarConsulta ? "Ocultar consulta" : "💬 Consultar otros productos"}
          </button>

          {mostrarConsulta && (
            <div className="mt-2 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Preguntale al vendedor por otros productos para sumar a este pedido.
              </p>
              <input
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Ej: ¿Tenés cinta aisladora negra?"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                disabled={consultandoIA}
                onClick={() => void enviarConsulta()}
                className="w-full rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {consultandoIA ? "Preguntando al vendedor..." : "Preguntar al vendedor"}
              </button>
              {respuestaExtra && (
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-[11px] font-semibold uppercase opacity-70">
                    {vendedor || "Vendedor"}
                  </p>
                  <p className="text-sm">{respuestaExtra.mensaje}</p>
                  <button
                    type="button"
                    onClick={() =>
                      agregarExtra({
                        descripcion: respuestaExtra.articulo || consulta.trim(),
                        ...(respuestaExtra.precio !== undefined ? { precio: respuestaExtra.precio } : {}),
                      })
                    }
                    className="mt-2 w-full rounded-lg bg-primary py-2 text-xs font-bold uppercase tracking-wide text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Agregar al pedido
                    {respuestaExtra.precio ? ` (${money.format(respuestaExtra.precio)})` : ""}
                  </button>
                </div>
              )}
            </div>
          )}

          {extras.length > 0 && (
            <div className="mt-2 space-y-1">
              {extras.map((e, i) => (
                <p
                  key={i}
                  className="rounded bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                >
                  ✓ Agregado al pedido: {e.descripcion}
                  {e.precio ? ` — ${money.format(e.precio)}` : ""}
                </p>
              ))}
              <p className="text-[11px] text-muted-foreground">Los extras se suman al total. Cada artículo agregado reinicia el regateo con 3 minutos sobre el nuevo total.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
