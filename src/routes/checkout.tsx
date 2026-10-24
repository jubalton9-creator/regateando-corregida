import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CheckoutSearch = { monto?: number | undefined; detalle?: string | undefined; pedido?: string | undefined };

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    monto: search["monto"] ? Number(search["monto"]) : undefined,
    detalle: typeof search["detalle"] === "string" ? search["detalle"] : undefined,
    pedido: typeof search["pedido"] === "string" ? search["pedido"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pago seguro | Regateando" },
      {
        name: "description",
        content:
          "Cerrá tu compra con pago seguro y cifrado. Aceptamos tarjetas internacionales en modo prueba.",
      },
      { property: "og:title", content: "Pago seguro | Regateando" },
      {
        property: "og:description",
        content: "Cerrá tu compra con pago seguro y cifrado en Regateando.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const soloDigitos = (s: string) => s.replace(/\D/g, "");

function luhn(num: string) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = Number(num[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return num.length >= 13 && sum % 10 === 0;
}

function marca(num: string) {
  if (num.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(num)) return "Mastercard";
  if (/^3[47]/.test(num)) return "American Express";
  return "Tarjeta internacional";
}

function CheckoutPage() {
  const { monto, detalle, pedido } = Route.useSearch();
  const { user } = useSession();

  const importe = monto && monto > 0 ? monto : 0;
  const descripcion = detalle || "Compra en Regateando";

  const [nombre, setNombre] = useState("");
  const [numero, setNumero] = useState("");
  const [vence, setVence] = useState("");
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [pagado, setPagado] = useState<{ referencia: string } | null>(null);

  const numeroLimpio = soloDigitos(numero);
  const valida = useMemo(() => luhn(numeroLimpio), [numeroLimpio]);

  const formatNumero = (v: string) =>
    soloDigitos(v).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  const formatVence = (v: string) => {
    const d = soloDigitos(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };

  const pagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { toast.error("Ingresá el nombre que figura en la tarjeta."); return; }
    if (!valida) { toast.error("El número de tarjeta no es válido."); return; }
    if (!/^\d{2}\/\d{2}$/.test(vence)) { toast.error("Revisá la fecha de vencimiento (MM/AA)."); return; }
    if (soloDigitos(cvv).length < 3) { toast.error("Revisá el código de seguridad."); return; }
    if (importe <= 0) { toast.error("No hay un importe para cobrar."); return; }

    setBusy(true);
    try {
      // Simulación de pasarela internacional: nunca guardamos datos de tarjeta.
      await new Promise((r) => setTimeout(r, 1600));
      const referencia = `SIM-${Math.random().toString(36).slice(2, 12).toUpperCase()}`;

      if (user) {
        const { error } = await supabase.from("pagos").insert({
          buyer_id: user.id,
          pedido_id: pedido ?? null,
          descripcion,
          monto: Math.round(importe),
          moneda: "ARS",
          estado: "aprobado",
          referencia,
        });
        if (error) console.error("No pudimos registrar el pago:", error.message);
      }

      setPagado({ referencia });
      toast.success("¡Pago aprobado!");
    } catch {
      toast.error("La pasarela rechazó la operación. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  if (pagado) {
    return (
      <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold">Pago aprobado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
          <p className="mt-4 text-3xl font-bold">${importe.toLocaleString("es-AR")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Referencia <span className="font-mono">{pagado.referencia}</span>
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md">
        <h1 className="text-center text-2xl font-bold">Pago seguro</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Conexión cifrada. Modo prueba de pasarela internacional.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Vas a pagar</p>
              <p className="mt-1 text-sm font-medium">{descripcion}</p>
            </div>
            <p className="whitespace-nowrap text-2xl font-bold">
              ${importe.toLocaleString("es-AR")}
            </p>
          </div>
        </div>

        <form onSubmit={pagar} className="mt-4 flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
            <span aria-hidden>🔒</span>
            <span>Tus datos viajan cifrados y no se guardan en Regateando.</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="nombre">Nombre en la tarjeta</Label>
            <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="JUAN PEREZ" autoComplete="cc-name" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Número de tarjeta</Label>
            <Input
              id="numero"
              inputMode="numeric"
              value={numero}
              onChange={(e) => setNumero(formatNumero(e.target.value))}
              placeholder="4242 4242 4242 4242"
              autoComplete="cc-number"
            />
            <p className="text-xs text-muted-foreground">
              {numeroLimpio.length >= 4 ? marca(numeroLimpio) : "Visa, Mastercard y Amex"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="vence">Vencimiento</Label>
              <Input id="vence" inputMode="numeric" value={vence} onChange={(e) => setVence(formatVence(e.target.value))} placeholder="MM/AA" autoComplete="cc-exp" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cvv">Código</Label>
              <Input id="cvv" inputMode="numeric" value={cvv} onChange={(e) => setCvv(soloDigitos(e.target.value).slice(0, 4))} placeholder="123" autoComplete="cc-csc" />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="h-14 w-full text-base font-semibold">
            {busy ? "PROCESANDO..." : `PAGAR $${importe.toLocaleString("es-AR")}`}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Simulación: usá 4242 4242 4242 4242 para aprobar el pago.
          </p>
        </form>

        <div className="mt-6 text-center">
          
        </div>
      </div>
    </main>
  );
}
