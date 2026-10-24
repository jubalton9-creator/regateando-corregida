import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

const PAGINAS = [
  { to: "/", label: "🏠 Inicio" },
  { to: "/compradores/registro", label: "🧾 Registro compradores" },
  { to: "/comercios/registro", label: "🏬 Registro comercios" },
  { to: "/pedido", label: "🔄 Comprar / Vender" },
  { to: "/esperando-ofertas", label: "🤝 Negociación Comprador" },
  { to: "/cotizar", label: "🤝 Negociación Vendedor" },
  { to: "/checkout", label: "💳 Checkout" },
  { to: "/mi-cuenta", label: "👤 Mi cuenta" },
  { to: "/admin", label: "🛠️ Admin" },
] as const;

export function NavBarPaginas() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const desplazar = (direccion: number) => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollBy({
      left: direccion * container.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <nav aria-label="Páginas de la app" className="sticky top-0 z-50 flex w-full min-w-0 items-center bg-navigation text-navigation-foreground">
      <Button type="button" variant="ghost" aria-label="Deslizar hacia la izquierda" title="Deslizar hacia la izquierda" onClick={() => desplazar(-1)} className="h-12 w-10 shrink-0 rounded-none p-0 text-2xl text-navigation-foreground hover:bg-navigation-hover hover:text-navigation-foreground">
        {"<"}
      </Button>
      <div ref={scrollRef} className="flex min-w-0 flex-1 touch-pan-x gap-2 overflow-x-auto overscroll-x-contain py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PAGINAS.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            activeOptions={{ exact: true }}
            className="shrink-0 whitespace-nowrap rounded-full border border-navigation-foreground/30 px-3 py-1.5 text-xs font-semibold text-navigation-foreground"
            activeProps={{ className: "!border-primary bg-primary !text-primary-foreground" }}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <Button type="button" variant="ghost" aria-label="Deslizar hacia la derecha" title="Deslizar hacia la derecha" onClick={() => desplazar(1)} className="h-12 w-10 shrink-0 rounded-none p-0 text-2xl text-navigation-foreground hover:bg-navigation-hover hover:text-navigation-foreground">
        {">"}
      </Button>
    </nav>
  );
}
