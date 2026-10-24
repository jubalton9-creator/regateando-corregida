import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NegociarPanel } from "@/components/NegociarPanel";
import { Button } from "@/components/ui/button";
import { RegateoPanel } from "@/components/RegateoPanel";

export type Oferta = {
  proveedorId?: string;
  cotizacionId?: string;
  producto: string;
  precio: number;
  entrega: string;
  imageUrl?: string;
};

export type Resultado = {
  encontrado: boolean;
  mensaje: string;
  ofertas: Oferta[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resultado: Resultado | null;
  buyerName?: string;
  onDesistir?: () => void;
  desistiendo?: boolean;
  cancellationToken?: string | undefined;
  onCambio?: (() => void) | undefined;
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function ResultadoDialog({ open, onOpenChange, resultado, buyerName, onDesistir, desistiendo, cancellationToken, onCambio }: Props) {
  const [descartadas, setDescartadas] = useState<number[]>([]);
  if (!resultado) return null;

  function desistirOferta(i: number) {
    const nuevas = [...descartadas, i];
    if (nuevas.length >= (resultado?.ofertas.length ?? 0)) {
      onDesistir?.();
      return;
    }
    setDescartadas(nuevas);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-muted sm:max-w-4xl">
        <DialogHeader>
          {buyerName && <p className="text-center text-base font-semibold text-primary">{buyerName}, estas son tus ofertas</p>}
          <DialogTitle className="text-center text-xl font-extrabold tracking-wide text-primary">
            {resultado.encontrado ? "ENCONTRAMOS TU PRODUCTO" : "SEGUIMOS BUSCANDO"}
          </DialogTitle>
        </DialogHeader>

        <div className={`mt-2 grid grid-cols-1 gap-4 ${resultado.ofertas.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {resultado.ofertas.map((o, i) => descartadas.includes(i) ? null : (
            <div
              key={i}
              className="flex min-w-0 flex-col rounded-xl border border-border bg-background p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Oferta {i + 1} · Proveedor #{i + 1}
              </p>
              {o.imageUrl ? (
                <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white">
                  <img
                    src={o.imageUrl}
                    alt={`Producto ofrecido: ${o.producto}`}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-40 w-full object-contain"
                  />
                </div>
              ) : null}
              <p className="mt-2 text-base font-semibold text-foreground">{o.producto}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xl font-bold text-primary">{money.format(o.precio)}</span>
                {!o.cotizacionId && <div className="flex flex-col gap-2">
                
                {onDesistir && <Button type="button" variant="destructive" size="sm" disabled={desistiendo} onClick={() => desistirOferta(i)}>
                  {desistiendo ? "CERRANDO…" : "DESISTO"}
                </Button>}
                </div>}
              </div>
              {o.entrega && <p className="mt-1 text-xs text-muted-foreground">{o.entrega}</p>}
              <div className="mt-auto">
                {o.cotizacionId ? <RegateoPanel cotizacionId={o.cotizacionId} lado="comprador" producto={o.producto} precioInicial={o.precio} cancellationToken={cancellationToken} onCambio={onCambio} /> : <NegociarPanel
                  producto={o.producto}
                  proveedorId={o.proveedorId || ""}
                  vendedor={`Proveedor #${i + 1}`}
                  precioLista={o.precio}
                />}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border-2 border-primary bg-primary/10 p-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            No te olvides de negociar
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
