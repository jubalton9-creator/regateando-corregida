import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
  base: readonly string[];
  tipo: "zona" | "rubro";
  placeholder: string;
  placeholderOtro: string;
};

type Opcion = { id?: string; valor: string; activo: boolean; original: boolean };

export const ordenar = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

/** Originales en orden alfabético y, debajo, los agregados por "Otros" también en orden alfabético. */
export function ordenarOpciones<T extends { valor: string; original: boolean }>(l: T[]): T[] {
  return [...l].sort((a, b) =>
    a.original === b.original ? ordenar(a.valor, b.valor) : a.original ? -1 : 1,
  );
}

/** Minúsculas y sin tildes, para buscar "san" y que aparezca "San Fernando". */
const normal = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

let adminPromise: Promise<boolean> | null = null;
// Al cambiar de sesión se vuelve a verificar si es administrador.
if (typeof window !== "undefined") supabase.auth.onAuthStateChange(() => { adminPromise = null; });
function esAdmin() {
  adminPromise ??= (async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false;
    const { data: r } = await supabase
      .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
    return !!r && r.length > 0;
  })();
  return adminPromise;
}

export function SelectConOtro({
  id, value, onChange, required, className, base, tipo, placeholder, placeholderOtro,
}: Props) {
  const [opciones, setOpciones] = useState<Opcion[]>(
    base.filter((b) => b !== "Otra" && b !== "Otros").map((valor) => ({ valor, activo: true, original: true })),
  );
  const [admin, setAdmin] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [menu, setMenu] = useState<{ op: Opcion; x: number; y: number } | null>(null);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  const [filtro, setFiltro] = useState("");
  const raiz = useRef<HTMLDivElement>(null);
  const buscador = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const a = await esAdmin();
      setAdmin(a);
      let q = supabase.from("opciones_lista").select("id, valor, activo, original").eq("tipo", tipo);
      if (!a) q = q.eq("activo", true);
      const { data, error } = await q;
      if (!error && data) setOpciones(data);
    })();
  }, [tipo]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAbierto(false);
        setMenu(null);
        setFiltro("");
      }
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  useEffect(() => {
    if (abierto) buscador.current?.focus();
  }, [abierto]);

  const lista = [...opciones];
  if (value && !lista.some((o) => o.valor === value)) lista.push({ valor: value, activo: true, original: false });
  const ordenada = ordenarOpciones(lista);

  /** Todo lo que contiene lo escrito, en el mismo orden en que se escribió. */
  const q = normal(filtro);
  const visibles = q ? ordenada.filter((o) => normal(o.valor).includes(q)) : ordenada;
  const exacto = ordenada.find((o) => normal(o.valor) === q);

  const elegir = (o: Opcion) => {
    if (!o.activo) return;
    onChange(o.valor);
    setEscribiendo(false);
    setAbierto(false);
    setFiltro("");
  };

  const alternar = async (o: Opcion) => {
    setMenu(null);
    if (!o.id || !(await esAdmin())) return void toast.error("Solo el administrador puede activar o desactivar.");
    const { error } = await supabase.from("opciones_lista").update({ activo: !o.activo }).eq("id", o.id);
    if (error) { toast.error("No se pudo cambiar."); return; }
    setOpciones((l) => l.map((x) => (x.id === o.id ? { ...x, activo: !x.activo } : x)));
    toast.success(`${o.valor} ${o.activo ? "desactivada" : "activada"}.`);
  };

  const agregar = async (desde?: string) => {
    const nuevo = (desde ?? texto).trim();
    if (!nuevo) return;
    const existente = lista.find((l) => l.valor.toLowerCase() === nuevo.toLowerCase());
    if (!existente) {
      const { data } = await supabase.from("opciones_lista")
        .insert({ tipo, valor: nuevo }).select("id, valor, activo, original").single();
      setOpciones((o) => [...o, data ?? { valor: nuevo, activo: true, original: false }]);
    }
    onChange(existente?.valor ?? nuevo);
    setTexto("");
    setFiltro("");
    setEscribiendo(false);
    setAbierto(false);
  };

  const tecla = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (visibles.length === 1) elegir(visibles[0]!);
    else if (visibles.length === 0 && q) agregar(filtro);
  };

  return (
    <div ref={raiz} className="relative flex flex-col gap-2">
      {/* Campo oculto para que el formulario exija un valor */}
      <input
        tabIndex={-1}
        aria-hidden
        required={required && !escribiendo}
        value={value}
        onChange={() => {}}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
      />
      <button
        id={id}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className={
          (className ?? "h-10 w-full rounded-md border border-input bg-background px-3 text-sm") +
          " flex items-center justify-between text-left"
        }
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {escribiendo ? "Otros (escribir)" : value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>

      {abierto && (
        <div className="absolute top-11 z-50 w-full overflow-hidden rounded-md border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-60" />
            <input
              ref={buscador}
              type="text"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              onKeyDown={tecla}
              placeholder="Escribí para buscar"
              aria-label={`Buscar ${tipo}`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {filtro && (
              <button
                type="button"
                onClick={() => setFiltro("")}
                className="shrink-0 text-xs text-muted-foreground hover:underline"
              >
                limpiar
              </button>
            )}
          </div>

          <ul className="max-h-60 overflow-y-auto py-1 text-sm">
            {admin && (
              <li className="px-3 py-1 text-xs text-muted-foreground">
                Clic derecho (o mantener apretado) para activar/desactivar
              </li>
            )}
            {visibles.map((o, i) => (
              <li
                key={o.valor}
                onClick={() => elegir(o)}
                onContextMenu={(e) => {
                  if (!admin) return;
                  e.preventDefault();
                  const r = raiz.current!.getBoundingClientRect();
                  setMenu({ op: o, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                className={
                  "cursor-pointer px-3 py-2 hover:bg-accent " +
                  (o.valor === value ? "font-semibold text-primary " : "") +
                  (!o.activo ? "text-muted-foreground line-through " : "") +
                  (!o.original && (i === 0 || visibles[i - 1]!.original) ? "border-t " : "")
                }
              >
                {o.valor}
              </li>
            ))}
            {q && visibles.length === 0 && (
              <li className="px-3 py-2 text-muted-foreground">
                No encontramos “{filtro.trim()}”.{" "}
                <button
                  type="button"
                  onClick={() => agregar(filtro)}
                  className="font-semibold text-primary underline"
                >
                  Agregar “{filtro.trim()}”
                </button>
              </li>
            )}
            {q && visibles.length > 0 && !exacto && (
              <li
                onClick={() => agregar(filtro)}
                className="cursor-pointer border-t px-3 py-2 font-medium hover:bg-accent"
              >
                Agregar “{filtro.trim()}”
              </li>
            )}
            <li
              onClick={() => { setEscribiendo(true); setAbierto(false); setFiltro(""); }}
              className="cursor-pointer border-t px-3 py-2 font-medium hover:bg-accent"
            >
              Otros (escribir)
            </li>
          </ul>
        </div>
      )}

      {menu && (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="absolute z-[60] rounded-md border bg-popover p-1 text-sm shadow-xl"
        >
          <button
            type="button"
            onClick={() => alternar(menu.op)}
            className="block w-full rounded px-3 py-2 text-left hover:bg-accent"
          >
            {menu.op.activo ? "Desactivar" : "Activar"} “{menu.op.valor}”
          </button>
        </div>
      )}

      {escribiendo && (
        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder={placeholderOtro}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); agregar(); }
            }}
          />
          <Button type="button" onClick={() => agregar()} disabled={!texto.trim()}>Agregar</Button>
        </div>
      )}
    </div>
  );
}
