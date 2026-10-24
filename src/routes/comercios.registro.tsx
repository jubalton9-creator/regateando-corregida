import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectZona } from "@/components/SelectZona";
import { SelectBarrio } from "@/components/SelectBarrio";
import { SelectRubro } from "@/components/SelectRubro";
import { validarDatosComercio, type DatosComercio } from "@/lib/registro-comercio";

export const Route = createFileRoute("/comercios/registro")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Registro de comercios · Regateando" },
      { name: "description", content: "Registrá tu comercio en Regateando con tus datos, CUIT, rubro, zona y contacto." },
      { property: "og:title", content: "Registro de comercios · Regateando" },
      { property: "og:description", content: "Sumá tu comercio a Regateando y recibí pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegistroComercio,
});

const VACIO: DatosComercio = {
  nombreApellido: "", dni: "", cuit: "", nombre_comercio: "", rubro: "", zona: "",
  barrio: "", direccion: "", telefono: "", whatsapp: "", correo: "", alias: "",
};

// Cliente aparte que no guarda sesión: registrar un comercio nuevo nunca cambia
// la sesión de quien está usando la página (por ejemplo, el administrador).
function clienteRegistro() {
  return createClient(import.meta.env["VITE_SUPABASE_URL"] as string, import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "regateando-registro-tmp" },
  });
}

function RegistroComercio() {
  const [d, setD] = useState<DatosComercio>(VACIO);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState("");

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const dni = d.dni.replace(/\D/g, "");
    const cuit = d.cuit.replace(/\D/g, "");
    const cel = d.whatsapp.replace(/\D/g, "");
    const error = validarDatosComercio(d);
    if (error) return void toast.error(error);
    const [nombre, ...resto] = d.nombreApellido.trim().split(/\s+/);
    const meta = {
      role: "vendedor",
      nombre: nombre ?? "", apellido: resto.join(" ") || "",
      full_name: d.nombreApellido.trim(),
      dni, cuit,
      nombre_comercio: d.nombre_comercio.trim(),
      rubro: d.rubro, zona: d.zona, barrio: d.barrio.trim(),
      direccion: d.direccion.trim(), telefono: d.telefono.trim(),
      phone: cel, whatsapp: d.whatsapp.trim(),
    };
    setBusy(true);
    setAviso("");
    try {
      const cli = clienteRegistro();
      const { data, error } = await cli.auth.signUp({
        email: d.correo.trim(),
        password: d.alias,
        options: { emailRedirectTo: window.location.origin, data: meta },
      });
      const yaExiste =
        (error && (/already|registered|exists/i.test(error.message) || (error as { code?: string }).code === "user_already_exists")) ||
        (!error && (data.user?.identities?.length ?? 0) === 0);
      if (error && !yaExiste) throw error;
      if (yaExiste) {
        // El correo ya tiene cuenta (por ejemplo, como particular): si el alias
        // coincide, sumamos el comercio a esa misma cuenta.
        const { error: eIn } = await cli.auth.signInWithPassword({ email: d.correo.trim(), password: d.alias });
        if (eIn) throw new Error("Ese correo ya está registrado con otro alias. Escribí el mismo alias que usaste al registrarte, o usá otro correo.");
        const { data: res, error: eRpc } = await cli.rpc("agregar_comercio_propio", { _m: meta });
        await cli.auth.signOut();
        if (eRpc) throw eRpc;
        if (res === "ya_existe") throw new Error("Ese correo ya tiene un comercio registrado. Para cambiar sus datos usá «Mi cuenta».");
      }
      setD(VACIO);
      setAviso(
        yaExiste
          ? `Listo: ${meta.nombre_comercio} quedó registrado en tu cuenta.`
          : `Listo: ${meta.nombre_comercio} quedó registrado. Te avisamos por correo para confirmar la cuenta.`,
      );
      toast.success("¡Comercio registrado!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(/rate limit/i.test(msg) ? "Demasiados registros seguidos. Esperá un minuto y probá de nuevo." : msg || "No pudimos guardar los datos.");
    } finally {
      setBusy(false);
    }
  };

  const campo = (k: keyof DatosComercio, label: string, tipo: string, ph: string, opcional = false) => (
    <div key={k} className="flex flex-col gap-2">
      <Label htmlFor={k}>{label}{opcional ? " (opcional)" : " *"}</Label>
      <Input
        id={k}
        type={tipo}
        required={!opcional}
        minLength={k === "alias" ? 6 : undefined}
        inputMode={k === "dni" || k === "cuit" || k === "whatsapp" || k === "telefono" ? "text" : undefined}
        autoComplete={k === "alias" ? "new-password" : "off"}
        placeholder={ph}
        value={d[k]}
        onChange={(e) => setD({ ...d, [k]: e.target.value })}
      />
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Registro de comercios</h1>
        {aviso && (
          <p role="status" className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-center text-sm">{aviso}</p>
        )}
        <form onSubmit={guardar} className="mt-6 flex flex-col gap-4" autoComplete="off">
          {campo("nombreApellido", "Nombre y apellido", "text", "Jorge Pérez")}
          {campo("dni", "DNI", "text", "30123456")}
          {campo("cuit", "CUIT / CUIL", "text", "20-30123456-7")}
          {campo("nombre_comercio", "Nombre del comercio", "text", "Ferretería El Tornillo")}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rubro">Rubro *</Label>
            <SelectRubro id="rubro" required value={d.rubro} onChange={(v) => setD({ ...d, rubro: v })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="zona">Zona *</Label>
            <SelectZona id="zona" required value={d.zona} onChange={(v) => setD({ ...d, zona: v, barrio: "" })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="barrio">Barrio *</Label>
            <SelectBarrio id="barrio" required zona={d.zona} value={d.barrio} onChange={(v) => setD({ ...d, barrio: v })} />
          </div>
          {campo("direccion", "Dirección del comercio", "text", "Av. Siempre Viva 742")}
          {campo("telefono", "Teléfono de línea", "tel", "011 4444 4444", true)}
          {campo("whatsapp", "Celular / WhatsApp", "tel", "+54 9 11 5555 5555")}
          {campo("correo", "Correo electrónico", "email", "comercio@email.com")}
          {campo("alias", "Alias (letras) o contraseña (números y letras)", "text", "Ej: el_tornillo o abc123")}
          <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
            {busy ? "Guardando…" : "REGISTRAR COMERCIO"}
          </Button>
        </form>
        <div className="mt-6 flex flex-col gap-3">
          
          
        </div>
      </div>
    </main>
  );
}
