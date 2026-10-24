import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MisDatos } from "@/components/MisDatos";

export const Route = createFileRoute("/mi-cuenta")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mi cuenta · Regateando" },
      { name: "description", content: "Verificá tu correo y tu alias o contraseña para consultar y modificar tus datos en Regateando." },
      { property: "og:title", content: "Mi cuenta · Regateando" },
      { property: "og:description", content: "Modificá tus datos de comprador o de comercio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MiCuenta,
});

function MiCuenta() {
  const [tipo, setTipo] = useState<"comprador" | "vendedor">("comprador");
  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Mi cuenta</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant={tipo === "comprador" ? "default" : "outline"} onClick={() => setTipo("comprador")}>Particular</Button>
          <Button variant={tipo === "vendedor" ? "default" : "outline"} onClick={() => setTipo("vendedor")}>Comercio</Button>
        </div>
        <MisDatos key={tipo} tipo={tipo} />
        <div className="mt-6 flex flex-col gap-3">
          
          
        </div>
      </div>
    </main>
  );
}
