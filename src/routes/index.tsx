import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SelectZona } from "@/components/SelectZona";
import { ZONAS_HABILITADAS } from "@/lib/zonas";

const CIUDADES_HABILITADAS = ZONAS_HABILITADAS;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Regateando.online — Negociá el precio con el vendedor" },
      {
        name: "description",
        content:
          "Pedí lo que buscás y negociá el precio directo con comercios de Zona Norte.",
      },
      { property: "og:title", content: "Regateando.online — Negociá el precio directo" },
      {
        property: "og:description",
        content:
          "Pedí lo que buscás y negociá el precio con comercios cercanos de Victoria, San Fernando y Tigre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const [ciudad, setCiudad] = useState("Victoria");
  const [enEspera, setEnEspera] = useState(false);

  const elegirCiudad = (v: string) => {
    setCiudad(v);
    setEnEspera(!CIUDADES_HABILITADAS.includes(v));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <header className="text-center">
        <h1 className="text-[28px] font-extrabold tracking-tight text-primary">
          REGATEANDO.ONLINE
        </h1>
        <p className="my-4 text-lg font-bold leading-snug text-foreground">
          La única plataforma que te permite negociar el precio directo con el vendedor.
        </p>
        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          Operando con total seguridad en toda la Zona Norte
        </span>
      </header>

      

      {!enEspera ? (
        <section className="mt-8 rounded-2xl border border-border bg-muted/40 p-6 shadow-sm">
          <h2 className="text-center text-base font-bold uppercase tracking-wide text-muted-foreground">
            Elegí tu perfil para empezar
          </h2>

          <div className="mt-5">
            <label htmlFor="ciudad" className="text-xs font-semibold uppercase text-muted-foreground">
              Tu ciudad
            </label>
            <div className="mt-2">
              <SelectZona
                id="ciudad"
                value={ciudad}
                onChange={elegirCiudad}
                className="h-12 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div className="w-full rounded-xl border-2 border-border bg-white p-4 text-left "
            >
              <div className="text-base font-bold text-foreground">➡️ Registro particulares</div>
              <div className="text-[13px] text-muted-foreground">
                Comprás a comisión 0% con tu cuenta de Google o WhatsApp.
              </div>
            </div>

            <div className="w-full rounded-xl border-2 border-border bg-white p-4 text-left "
            >
              <div className="text-base font-bold text-foreground">➡️ Registro comercios</div>
              <div className="text-[13px] text-muted-foreground">
                Consultá los pedidos para tu comercio.
              </div>
            </div>

            <div className="w-full rounded-xl border-2 border-border bg-white p-4 text-left "
            >
              <div className="text-base font-bold text-foreground">➡️ Estoy registrado</div>
              <div className="text-[13px] text-muted-foreground">
                Pedí o vendé; tus datos se validan al usar la app.
              </div>
            </div>
          </div>

          <footer className="mt-6 border-t border-border pt-4 text-center">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Al registrarte, aceptás los Términos de Libre Negociación y el Sistema de Pago Seguro
              con Retención de Fondos por 10 días (Escrow) de{" "}
              <strong>THE MILLION CHALLENGE, INC.</strong> bajo el amparo de la Ley 11.723.
            </p>
          </footer>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border-2 border-amber-500 bg-amber-50 p-6 text-center">
          <div className="mb-2 text-3xl">⏳</div>
          <h2 className="mb-3 text-lg font-extrabold uppercase text-amber-700">
            ¡Registro exitoso! Ya sos parte de la comunidad
          </h2>
          <p className="text-left text-sm leading-relaxed text-amber-900">
            <strong>Tu cuenta ya quedó activa y blindada en nuestro sistema.</strong>
            <br />
            <br />
            Actualmente estamos <strong>OPERANDO</strong> las ofertas en Victoria, San Fernando y
            Tigre. Como tu zona está en la lista de próximas aperturas, te vamos a{" "}
            <strong>ENVIAR</strong> un alerta directo al WhatsApp apenas <strong>HABILITEMOS</strong>{" "}
            tu ciudad para que seas el primero en negociar.
            <br />
            <br />
            ¡Gracias por sumarte a la revolución de los precios libres!
          </p>
          <button
            type="button"
            onClick={() => setEnEspera(false)}
            className="mt-5 text-sm font-medium text-amber-800 underline"
          >
            Volver a elegir mi ciudad
          </button>
        </section>
      )}
    </main>
  );
}
