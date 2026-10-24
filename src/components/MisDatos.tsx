/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectZona } from "@/components/SelectZona";
import { SelectBarrio } from "@/components/SelectBarrio";
import { SelectRubro } from "@/components/SelectRubro";
import { prepararCambioAcceso } from "@/lib/cambios-acceso";
import { cuentaVerificada } from "@/lib/cuenta-verificada";

type Tipo = "comprador" | "vendedor";
type Campo = { k: string; label: string; tipo?: string };

const CAMPOS: Record<Tipo, Campo[]> = {
  comprador: [
    { k: "nombre", label: "Nombre" },
    { k: "apellido", label: "Apellido" },
    { k: "dni", label: "DNI" },
    { k: "whatsapp", label: "Celular", tipo: "tel" },
  ],
  vendedor: [
    { k: "nombre", label: "Nombre" },
    { k: "apellido", label: "Apellido" },
    { k: "dni", label: "DNI" },
    { k: "cuit", label: "CUIT / CUIL" },
    { k: "nombre_comercio", label: "Nombre del comercio" },
    { k: "direccion", label: "Dirección del comercio" },
    { k: "telefono", label: "Teléfono de línea (opcional)", tipo: "tel" },
    { k: "whatsapp", label: "Celular / WhatsApp", tipo: "tel" },
  ],
};

/** Recheck email/password on each account-page visit before loading private profile data. */
export function MisDatos({ tipo }: { tipo: Tipo }) {
  const { user } = useSession();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [usuarioVerificado, setUsuarioVerificado] = useState<string | null>(null);
  const [errorIngreso, setErrorIngreso] = useState("");
  const [busy, setBusy] = useState(false);
  const [fila, setFila] = useState<Record<string, string> | null>(null);
  const [sinFicha, setSinFicha] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [correoEdicion, setCorreoEdicion] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [guardandoAcceso, setGuardandoAcceso] = useState(false);
  const [avisoAcceso, setAvisoAcceso] = useState("");

  const tabla = tipo === "comprador" ? "compradores" : "vendedores";
  const col = tipo === "comprador" ? "user_id" : "owner_id";
  const verificado = cuentaVerificada(user?.id, usuarioVerificado);

  useEffect(() => {
    setCorreoEdicion(user?.email ?? "");
    setClaveNueva("");
    setAvisoAcceso("");
  }, [user?.id, user?.email]);

  useEffect(() => {
    setFila(null);
    setSinFicha(false);
    setErrorCarga(false);
    if (!user || !verificado) return;
    let vigente = true;
    void (async () => {
      const { data, error } = await (supabase.from as any)(tabla).select("*").eq(col, user.id).maybeSingle();
      if (!vigente) return;
      if (error) { setErrorCarga(true); return; }
      if (!data) { setSinFicha(true); setFila(null); return; }
      setSinFicha(false);
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) r[k] = v == null ? "" : String(v);
      setFila(r);
    })();
    return () => { vigente = false; };
  }, [user?.id, verificado, tabla, col]);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorIngreso("");
    setUsuarioVerificado(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
      if (error || !data.user) {
        setErrorIngreso("El correo y el alias o contraseña no coinciden.");
        return;
      }
      setUsuarioVerificado(data.user.id);
      setClave("");
      toast.success("¡Datos de acceso verificados!");
    } catch {
      setErrorIngreso("No pudimos verificar tus datos de acceso. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fila || !user || !verificado) return;
    const cambios: Record<string, string> = {};
    for (const c of CAMPOS[tipo]) cambios[c.k] = fila[c.k]?.trim() ?? "";
    cambios["zona"] = fila["zona"] ?? "";
    cambios["barrio"] = fila["barrio"] ?? "";
    if (tipo === "vendedor") cambios["rubro"] = fila["rubro"] ?? "";
    setBusy(true);
    const { data, error } = await (supabase.from as any)(tabla).update(cambios as never).eq(col, user.id).select("*").single();
    setBusy(false);
    if (error || !data) toast.error("No pudimos guardar los cambios.");
    else {
      const guardada: Record<string, string> = {};
      for (const [k, v] of Object.entries(data)) guardada[k] = v == null ? "" : String(v);
      setFila(guardada);
      toast.success("¡Datos actualizados!");
    }
  };

  const salir = async () => {
    setUsuarioVerificado(null);
    await supabase.auth.signOut();
    setFila(null);
    setCorreo("");
    setClave("");
  };

  const guardarAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !verificado) return;
    setGuardandoAcceso(true);
    setAvisoAcceso("");
    try {
      const cambios = prepararCambioAcceso(correoEdicion, user.email ?? "", claveNueva);
      if (!cambios.email && !cambios.password) {
        setAvisoAcceso("No hay cambios en el correo ni en el alias o contraseña.");
        return;
      }
      const { data, error } = await supabase.auth.updateUser(cambios);
      if (error) throw error;
      setClaveNueva("");
      const correoPendiente = cambios.email && data.user.email?.toLowerCase() !== cambios.email.toLowerCase();
      const mensaje = correoPendiente
        ? `${cambios.password ? "Alias o contraseña actualizado. " : ""}El cambio de correo está pendiente de confirmación. Revisá el correo actual y el nuevo.`
        : cambios.email && cambios.password
          ? "¡Correo y alias o contraseña actualizados!"
          : cambios.email ? "¡Correo actualizado!" : "¡Alias o contraseña actualizado!";
      setAvisoAcceso(mensaje);
      toast.success(mensaje);
    } catch {
      toast.error("No pudimos cambiar los datos de acceso. Verificá el correo y probá de nuevo; si te pide volver a ingresar, salí e ingresá con tu clave actual.");
    } finally {
      setGuardandoAcceso(false);
    }
  };

  return (
    <section className="mt-4">
      {!verificado ? (
        <form onSubmit={ingresar} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-correo">Correo electrónico</Label>
            <Input id="md-correo" type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-clave">Alias o contraseña</Label>
            <Input id="md-clave" type="password" required value={clave} onChange={(e) => setClave(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="h-11">{busy ? "Ingresando…" : "INGRESAR"}</Button>
          {errorIngreso && <p role="alert" className="text-sm text-destructive">{errorIngreso}</p>}
        </form>
      ) : errorCarga ? (
        <p role="alert" className="mt-3 text-center text-sm text-destructive">No pudimos cargar tus datos. Volvé a abrir Mi cuenta.</p>
      ) : sinFicha ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Esta cuenta no tiene datos de {tipo === "comprador" ? "comprador" : "comercio"} cargados.
        </p>
      ) : !fila ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <>
        <form onSubmit={guardar} className="mt-4 flex flex-col gap-3">
          {CAMPOS[tipo].map((c) => (
            <div key={c.k} className="flex flex-col gap-2">
              <Label htmlFor={`md-${c.k}`}>{c.label}</Label>
              <Input id={`md-${c.k}`} type={c.tipo ?? "text"} value={fila[c.k] ?? ""} onChange={(e) => setFila({ ...fila, [c.k]: e.target.value })} />
            </div>
          ))}
          {tipo === "vendedor" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="md-rubro">Rubro</Label>
              <SelectRubro id="md-rubro" value={fila["rubro"] ?? ""} onChange={(v) => setFila({ ...fila, rubro: v })} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-zona">Zona</Label>
            <SelectZona id="md-zona" value={fila["zona"] ?? ""} onChange={(v) => setFila({ ...fila, zona: v, barrio: "" })} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-barrio">Barrio</Label>
            <SelectBarrio id="md-barrio" zona={fila["zona"] ?? ""} value={fila["barrio"] ?? ""} onChange={(v) => setFila({ ...fila, barrio: v })} />
          </div>
          <Button type="submit" disabled={busy} className="h-11">{busy ? "Guardando…" : "GUARDAR CAMBIOS"}</Button>
        </form>
        <form onSubmit={guardarAcceso} className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-correo-edicion">Correo electrónico</Label>
            <Input id="md-correo-edicion" type="email" autoComplete="email" required value={correoEdicion} onChange={(e) => setCorreoEdicion(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="md-clave-nueva">Nuevo alias o contraseña (opcional)</Label>
            <Input id="md-clave-nueva" type="password" autoComplete="new-password" minLength={6} value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} />
          </div>
          <Button type="submit" disabled={guardandoAcceso || busy} className="h-auto min-h-11 whitespace-normal py-2">{guardandoAcceso ? "Guardando…" : "GUARDAR CORREO Y ALIAS / CONTRASEÑA"}</Button>
          {avisoAcceso && <p role="status" className="text-sm text-muted-foreground">{avisoAcceso}</p>}
        </form>
        </>
      )}
      {user && <Button variant="link" disabled={busy || guardandoAcceso} className="mt-2 w-full" onClick={salir}>Salir</Button>}
    </section>
  );
}
