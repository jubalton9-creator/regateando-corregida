import { AdminListas } from "@/components/AdminListas";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SelectZona } from "@/components/SelectZona";
import { SelectRubro } from "@/components/SelectRubro";
import { asignarClaveAdmin } from "@/lib/admin-clave.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administración · Regateando" },
      { name: "description", content: "Panel privado para editar comercios, vendedores y compradores de Regateando." },
      { property: "og:title", content: "Administración · Regateando" },
      { property: "og:description", content: "Panel privado de Regateando." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Tabla = "suppliers" | "vendedores" | "compradores";
type Campo = { key: string; label: string; tipo?: "bool" | "zona" | "rubro" };

const CONFIG: Record<Tabla, { titulo: string; campos: Campo[] }> = {
  suppliers: {
    titulo: "Comercios",
    campos: [
      { key: "name", label: "Nombre" },
      { key: "category", label: "Rubro", tipo: "rubro" },
      { key: "zone", label: "Zona", tipo: "zona" },
      { key: "address", label: "Dirección" },
      { key: "phone", label: "Teléfono" },
      { key: "active", label: "Activo", tipo: "bool" },
    ],
  },
  vendedores: {
    titulo: "Vendedores",
    campos: [
      { key: "nombre_comercio", label: "Comercio" },
      { key: "nombre", label: "Nombre" },
      { key: "apellido", label: "Apellido" },
      { key: "rubro", label: "Rubro", tipo: "rubro" },
      { key: "dni", label: "DNI" },
      { key: "cuit", label: "CUIT / CUIL" },
      { key: "direccion", label: "Dirección" },
      { key: "ciudad", label: "Ciudad" },
      { key: "zona", label: "Zona", tipo: "zona" },
      { key: "telefono", label: "Teléfono" },
      { key: "whatsapp", label: "WhatsApp" },
      { key: "correo", label: "Correo" },
      { key: "activo", label: "Activo", tipo: "bool" },
    ],
  },
  compradores: {
    titulo: "Compradores",
    campos: [
      { key: "nombre", label: "Nombre" },
      { key: "apellido", label: "Apellido" },
      { key: "dni", label: "DNI" },
      { key: "whatsapp", label: "Celular" },
      { key: "correo", label: "Correo" },
      { key: "ciudad", label: "Ciudad" },
      { key: "zona", label: "Zona", tipo: "zona" },
      { key: "direccion", label: "Dirección" },
    ],
  },
};

type Fila = Record<string, unknown> & { id: string };

function AdminPage() {
  const [estado, setEstado] = useState<"cargando" | "sin-sesion" | "sin-permiso" | "ok">("cargando");
  const [tabla, setTabla] = useState<Tabla>("suppliers");
  const [verListas, setVerListas] = useState(false);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [editando, setEditando] = useState<Fila | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [claveNueva, setClaveNueva] = useState("");
  const [asignando, setAsignando] = useState(false);

  const asignarClave = async () => {
    if (!editando || tabla === "suppliers") return;
    setAsignando(true);
    try {
      await asignarClaveAdmin({ data: { tabla, filaId: editando.id, nueva: claveNueva } });
      toast.success("Contraseña nueva guardada.");
      setClaveNueva("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setAsignando(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setEstado("sin-sesion");
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin");
      setEstado(roles && roles.length > 0 ? "ok" : "sin-permiso");
    })();
  }, []);

  const cargar = async (t: Tabla) => {
    const { data, error } = await supabase.from(t).select("*").order("created_at", { ascending: false });
    if (error) { toast.error("No se pudo cargar la lista."); return; }
    setFilas((data ?? []) as unknown as Fila[]);
  };

  useEffect(() => {
    if (estado !== "ok") return;
    cargar(tabla);
    // Refresca solo para que los registros nuevos aparezcan sin recargar la página
    const id = window.setInterval(() => { if (!document.hidden) cargar(tabla); }, 8000);
    const alVolver = () => { if (!document.hidden) cargar(tabla); };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [estado, tabla]);

  const guardar = async () => {
    if (!editando) return;
    setGuardando(true);
    const cambios: Record<string, unknown> = {};
    for (const c of CONFIG[tabla].campos) cambios[c.key] = editando[c.key] ?? null;
    const { error } = await supabase.from(tabla).update(cambios as never).eq("id", editando.id);
    setGuardando(false);
    if (error) { toast.error("No se pudo guardar: " + error.message); return; }
    toast.success("Cambios guardados.");
    setEditando(null);
    cargar(tabla);
  };

  if (estado === "cargando") return <p className="p-6 text-center text-muted-foreground">Cargando…</p>;
  if (estado !== "ok")
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <h1 className="mb-2 text-xl font-bold">Acceso restringido</h1>
        <p className="mb-4 text-muted-foreground">
          {estado === "sin-sesion" ? "Ingresá con tu cuenta de administrador." : "Tu cuenta no tiene permiso de administrador."}
        </p>
        
      </div>
    );

  const campos = CONFIG[tabla].campos;
  const titulo = (f: Fila) => String(f[campos[0]?.key ?? "id"] ?? f["nombre"] ?? "(sin nombre)");

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Administración</h1>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(CONFIG) as Tabla[]).map((t) => (
          <Button key={t} variant={!verListas && t === tabla ? "default" : "outline"} onClick={() => { setTabla(t); setEditando(null); setVerListas(false); }}>
            {CONFIG[t].titulo}
          </Button>
        ))}
        <Button variant={verListas ? "default" : "outline"} onClick={() => setVerListas(true)}>Zonas y rubros</Button>
      </div>

      {verListas ? <AdminListas /> : editando ? (
        <div className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Editar {CONFIG[tabla].titulo.toLowerCase().slice(0, -1)}</h2>
          {campos.map((c) => (
            <label key={c.key} className="block text-sm">
              <span className="mb-1 block font-medium">{c.label}</span>
              {c.tipo === "bool" ? (
                <input type="checkbox" checked={Boolean(editando[c.key])} onChange={(e) => setEditando({ ...editando, [c.key]: e.target.checked })} className="h-5 w-5 accent-primary" />
              ) : c.tipo === "zona" ? (
                <SelectZona value={String(editando[c.key] ?? "")} onChange={(v) => setEditando({ ...editando, [c.key]: v })} />
              ) : c.tipo === "rubro" ? (
                <SelectRubro value={String(editando[c.key] ?? "")} onChange={(v) => setEditando({ ...editando, [c.key]: v })} />
              ) : (
                <Input value={String(editando[c.key] ?? "")} onChange={(e) => setEditando({ ...editando, [c.key]: e.target.value })} />
              )}
            </label>
          ))}
          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</Button>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
          </div>
          {tabla !== "suppliers" && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <span className="block text-sm font-medium">Asignar contraseña nueva</span>
              <div className="flex gap-2">
                <Input type="text" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} placeholder="Mínimo 6 caracteres" />
                <Button type="button" onClick={asignarClave} disabled={asignando || claveNueva.length < 6}>
                  {asignando ? "…" : "Guardar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filas.length === 0 && <li className="text-muted-foreground">No hay registros.</li>}
          {filas.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{titulo(f)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {campos.slice(1, 4).map((c) => f[c.key]).filter(Boolean).join(" · ")}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditando({ ...f })}>Editar</Button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
