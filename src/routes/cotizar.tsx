import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cotizar")({
  head: () => ({
    meta: [
      { title: "Cotizar y negociar | Regateando" },
      {
        name: "description",
        content:
          "Cargá la foto del producto, indicá importe y unidades, y mandá tu contraoferta para cerrar el trato.",
      },
      { property: "og:title", content: "Cotizar y negociar | Regateando" },
      {
        property: "og:description",
        content:
          "Cargá la foto del producto, indicá importe y unidades, y mandá tu contraoferta para cerrar el trato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CotizarPage,
});

function CotizarPage() {
  const [importe, setImporte] = useState("");
  const [unidades, setUnidades] = useState("");
  const [contraoferta, setContraoferta] = useState("");

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-10 pt-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Cotización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subí la foto, poné tu número y negociá.
        </p>
      </header>

      {/* 1) Visor de imágenes + botón de foto */}
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div
          role="img"
          aria-label="Visor de imágenes del producto"
          className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/60"
        >
          <div className="px-4 text-center">
            <span aria-hidden className="text-4xl">
              🖼️
            </span>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Acá se ve la foto del producto
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="mt-3 h-14 w-full text-sm font-bold uppercase tracking-wide"
        >
          Seleccionar y enviar foto
        </Button>
      </section>

      {/* 2) Importe + Unidades */}
      <section className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <Label htmlFor="importe">Importe en $</Label>
          <Input
            id="importe"
            inputMode="numeric"
            value={importe}
            onChange={(e) => setImporte(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Ej: 120000"
            className="h-12 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="unidades">Unidades</Label>
          <Input
            id="unidades"
            inputMode="numeric"
            value={unidades}
            onChange={(e) => setUnidades(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 1"
            className="h-12 text-base"
          />
        </div>
      </section>

      {/* 3) Recuadro REGATEANDO con contraofertas */}
      <section className="rounded-2xl border-2 border-primary bg-primary/5 p-4 shadow-sm">
        <h2 className="text-center text-lg font-extrabold uppercase tracking-[0.2em] text-primary">
          Regateando
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="recibir-contraoferta" className="text-muted-foreground">
              Recibir Contraoferta
            </Label>
            <Input
              id="recibir-contraoferta"
              readOnly
              disabled
              tabIndex={-1}
              placeholder="—"
              aria-readonly="true"
              className="h-12 cursor-not-allowed border-dashed bg-muted text-muted-foreground"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="enviar-contraoferta">Enviar Contraoferta</Label>
            <Input
              id="enviar-contraoferta"
              inputMode="numeric"
              value={contraoferta}
              onChange={(e) => setContraoferta(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Tu número"
              className="h-12 border-primary/60 bg-white text-base focus-visible:border-primary"
            />
          </div>
        </div>

        <Button
          type="button"
          className="mt-3 h-14 w-full text-sm font-bold uppercase tracking-wide"
        >
          Enviar propuesta
        </Button>
      </section>

      {/* 4) Botones espejo */}
      <section className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          className="h-20 w-full rounded-xl text-base font-extrabold uppercase tracking-wide"
        >
          Trato hecho
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-20 w-full rounded-xl border-2 border-foreground/20 text-base font-extrabold uppercase tracking-wide"
        >
          Desisto
        </Button>
      </section>
    </main>
  );
}
