import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectZona } from "@/components/SelectZona";
import { SelectRubro } from "@/components/SelectRubro";

const PENDING_KEY = "pedilo:comercio-pendiente";


type Comercio = {
  name: string;
  category: string;
  address: string;
  phone: string;
  zone: string;
};

export const Route = createFileRoute("/vendedores/registro")({
  head: () => ({
    meta: [
      { title: "Registrá tu comercio | Regateando" },
      {
        name: "description",
        content: "Sumá tu comercio y recibí pedidos de clientes cercanos para ofertar y negociar.",
      },
      { property: "og:title", content: "Registrá tu comercio | Regateando" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        property: "og:description",
        content: "Sumá tu comercio y recibí pedidos de clientes cercanos para ofertar y negociar.",
      },
    ],
  }),
  component: RegistroVendedor,
});

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const digits = (s: string) => s.replace(/\D/g, "").slice(-8);

/**
 * Si ya existe un comercio con el mismo nombre y teléfono, lo "reclama"
 * (le asigna el owner_id) en vez de crear un duplicado.
 */
async function guardarComercio(datos: Comercio, ownerId: string) {
  const { data: existentes } = await supabase
    .from("suppliers")
    .select("id, name, phone, owner_id");

  const match = (existentes ?? []).find(
    (s) =>
      norm(s.name ?? "") === norm(datos.name) &&
      digits(s.phone ?? "") === digits(datos.phone) &&
      digits(datos.phone).length >= 6,
  );

  if (match) {
    if (match.owner_id && match.owner_id !== ownerId) {
      throw new Error("Ese comercio ya fue reclamado por otra cuenta.");
    }
    const { error } = await supabase
      .from("suppliers")
      .update({
        owner_id: ownerId,
        category: datos.category,
        address: datos.address,
        zone: datos.zone,
        active: true,
      })
      .eq("id", match.id);
    if (error) throw error;
    return "reclamado" as const;
  }

  const { error } = await supabase
    .from("suppliers")
    .insert({ ...datos, owner_id: ownerId, active: true });
  if (error) throw error;
  return "creado" as const;
}

function RegistroVendedor() {
  const { session, user, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [listo, setListo] = useState(false);
  const [reclamado, setReclamado] = useState(false);
  const [comercio, setComercio] = useState<Comercio>({
    name: "",
    category: "Ferretería",
    address: "",
    phone: "",
    zone: "",
  });

  // Si el vendedor confirmó el email y vuelve, terminamos de crear el comercio.
  useEffect(() => {
    if (loading || !user) return;
    const pending = localStorage.getItem(PENDING_KEY);
    if (!pending) return;
    const datos = JSON.parse(pending) as Comercio;
    void guardarComercio(datos, user.id)
      .then((res) => {
        localStorage.removeItem(PENDING_KEY);
        setListo(true);
        setReclamado(res === "reclamado");
        toast.success(
          res === "reclamado" ? "¡Comercio vinculado a tu cuenta!" : "¡Comercio registrado!",
        );
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "No pudimos guardar tu comercio.",
        );
      });
  }, [loading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comercio.name.trim() || !comercio.phone.trim()) {
      toast.error("Completá el nombre y el teléfono del comercio.");
      return;
    }
    setBusy(true);
    try {
      let userId = user?.id;

      if (!session) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/vendedores/registro`,
            data: { full_name: comercio.name, phone: comercio.phone, role: "vendedor" },
          },
        });
        if (error) throw error;

        // Si el email ya estaba registrado, Supabase devuelve un usuario sin
        // identidades y no manda mail: intentamos iniciar sesión directamente.
        const yaExistia = !data.session && (data.user?.identities?.length ?? 0) === 0;
        if (yaExistia) {
          const { data: login, error: loginError } =
            await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            throw new Error(
              "Ese email ya tiene una cuenta. Ingresá con tu contraseña o restablecela desde la página de acceso.",
            );
          }
          userId = login.user.id;
        } else {
          userId = data.session?.user.id;
        }

        if (!userId) {
          localStorage.setItem(PENDING_KEY, JSON.stringify(comercio));
          toast.success("Te enviamos un email para confirmar tu cuenta y activar el comercio.");
          return;
        }
      }


      if (!userId) throw new Error("Ingresá con tu cuenta para registrar el comercio.");
      const res = await guardarComercio(comercio, userId);
      setListo(true);
      setReclamado(res === "reclamado");
      toast.success(
        res === "reclamado" ? "¡Comercio vinculado a tu cuenta!" : "¡Comercio registrado!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos registrar el comercio.");
    } finally {
      setBusy(false);
    }
  };

  if (listo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted px-5">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">
            {reclamado ? "¡Comercio vinculado!" : "¡Comercio registrado!"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {reclamado
              ? "Encontramos tu comercio ya cargado y lo asociamos a tu cuenta."
              : "Ya vas a empezar a recibir pedidos de clientes cercanos para ofertar."}
          </p>

        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">Registrá tu comercio</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Recibí pedidos de clientes de tu zona y ofertá tu precio.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {!session && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="comercio@email.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div className="h-px bg-border" />
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre del comercio</Label>
            <Input
              id="name"
              value={comercio.name}
              onChange={(e) => setComercio({ ...comercio, name: e.target.value })}
              placeholder="Ferretería El Tornillo"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Rubro</Label>
            <SelectRubro id="category" required value={comercio.category} onChange={(v) => setComercio({ ...comercio, category: v })} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Celular / WhatsApp</Label>
            <Input
              id="phone"
              value={comercio.phone}
              onChange={(e) => setComercio({ ...comercio, phone: e.target.value })}
              placeholder="+54 9 11 5555 5555"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              value={comercio.address}
              onChange={(e) => setComercio({ ...comercio, address: e.target.value })}
              placeholder="Av. Siempre Viva 742"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="zone">Zona</Label>
            <SelectZona
              id="zone"
              value={comercio.zone}
              onChange={(v) => setComercio({ ...comercio, zone: v })}
            />
          </div>

          <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
            {busy ? "Registrando..." : "REGISTRAR COMERCIO"}
          </Button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          
        </div>
      </div>
    </main>
  );
}

