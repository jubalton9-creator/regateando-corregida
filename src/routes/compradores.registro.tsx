import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectZona } from "@/components/SelectZona";
import { SelectBarrio } from "@/components/SelectBarrio";

export const Route = createFileRoute("/compradores/registro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Registro de compradores · Regateando" },
      { name: "description", content: "Completá tus datos de comprador en Regateando: nombre, apellido, DNI, celular y alias." },
      { property: "og:title", content: "Registro de compradores · Regateando" },
      { property: "og:description", content: "Sumate como comprador en Regateando." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistroComprador,
});

type Datos = { nombre: string; apellido: string; dni: string; zona: string; barrio: string; whatsapp: string; alias: string; correo: string };
const VACIO: Datos = { nombre: "", apellido: "", dni: "", zona: "", barrio: "", whatsapp: "", alias: "", correo: "" };

// Cliente aparte que no guarda sesión: registrar un comprador nuevo nunca cambia
// la sesión de quien está usando la página (por ejemplo, el administrador).
function clienteRegistro() {
  return createClient(import.meta.env["VITE_SUPABASE_URL"] as string, import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "regateando-registro-tmp" },
  });
}

function RegistroComprador() {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const dni = datos.dni.replace(/\D/g, "");
    const cel = datos.whatsapp.replace(/\D/g, "");
    const fila = { nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), dni, zona: datos.zona, barrio: datos.barrio.trim() };
    const correo = datos.correo.trim();
    if (!fila.nombre || !fila.apellido || !datos.alias || !fila.zona || !fila.barrio || !correo) return void toast.error("Completá todos los casilleros.");
    if (dni.length < 7 || dni.length > 8) return void toast.error("El DNI debe tener 7 u 8 números.");
    if (cel.length < 10) return void toast.error("Ingresá un celular válido con código de área.");
    if (datos.alias.length < 6) return void toast.error("El alias o contraseña debe tener al menos 6 caracteres.");
    setBusy(true);
    setAviso("");
    try {
      const { data, error } = await clienteRegistro().auth.signUp({
        email: correo,
        password: datos.alias,
        options: {
          emailRedirectTo: window.location.origin,
          data: { ...fila, full_name: `${fila.nombre} ${fila.apellido}`, phone: cel, role: "cliente" },
        },
      });
      if (error) throw error;
      if ((data.user?.identities?.length ?? 0) === 0) throw new Error("Ese correo ya tiene una cuenta. Usá «Olvidé mi usuario o contraseña».");
      setDatos(VACIO);
      setAviso(`Listo: ${fila.nombre} ${fila.apellido} quedó registrado como comprador. Le enviamos un correo para confirmar la cuenta.`);
      toast.success("¡Comprador registrado!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(/rate limit/i.test(msg) ? "Demasiados registros seguidos. Esperá un minuto y probá de nuevo." : msg || "No pudimos guardar los datos.");
    } finally {
      setBusy(false);
    }
  };

  const campo = (k: keyof Datos, label: string, tipo: string, ph: string) => (
    <div key={k} className="flex flex-col gap-2">
      <Label htmlFor={k}>{label} *</Label>
      <Input
        id={k}
        type={tipo}
        required
        minLength={k === "alias" ? 6 : undefined}
        inputMode={k === "dni" ? "numeric" : undefined}
        autoComplete={k === "alias" ? "new-password" : "off"}
        placeholder={ph}
        value={datos[k]}
        onChange={(e) => setDatos({ ...datos, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Registro de compradores</h1>
        {aviso && (
          <p role="status" className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-center text-sm">{aviso}</p>
        )}
        <form onSubmit={guardar} className="mt-6 flex flex-col gap-4" autoComplete="off">
          {campo("nombre", "Nombre", "text", "")}
          {campo("apellido", "Apellido", "text", "")}
          {campo("dni", "DNI", "text", "30123456")}
          <div className="flex flex-col gap-2">
            <Label htmlFor="zona">Zona *</Label>
            <SelectZona id="zona" required value={datos.zona} onChange={(v) => setDatos({ ...datos, zona: v, barrio: "" })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="barrio">Barrio *</Label>
            <SelectBarrio id="barrio" required zona={datos.zona} value={datos.barrio} onChange={(v) => setDatos({ ...datos, barrio: v })} />
          </div>
          {campo("whatsapp", "Celular", "tel", "11 5555 5555")}
          {campo("correo", "Correo electrónico", "email", "vos@email.com")}
          {campo("alias", "Alias (letras) o contraseña (números y letras)", "text", "Ej: jorge_compras o abc123")}
          <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
            {busy ? "Guardando…" : "REGISTRARME"}
          </Button>
        </form>
        <div className="mt-6 flex flex-col gap-3">
          
          
        </div>

      </div>
    </main>
  );
}
