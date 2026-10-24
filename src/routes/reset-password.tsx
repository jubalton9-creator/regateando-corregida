import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña | Regateando" },
      {
        name: "description",
        content: "Recuperá el acceso a tu cuenta de Regateando creando una contraseña nueva.",
      },
      { property: "og:title", content: "Restablecer contraseña | Regateando" },
      {
        property: "og:description",
        content: "Recuperá el acceso a tu cuenta de Regateando creando una contraseña nueva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { session, loading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Si el usuario llegó desde el link del email, ya tiene sesión de recuperación.
  const puedeCambiar = !loading && !!session;

  const pedirLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setEnviado(true);
      toast.success("Te enviamos un email para crear una contraseña nueva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos enviar el email.");
    } finally {
      setBusy(false);
    }
  };

  const guardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("¡Contraseña actualizada!");
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos actualizar la contraseña.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-muted px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h1 className="text-center text-2xl font-bold">
          {puedeCambiar ? "Elegí tu nueva contraseña" : "Restablecer contraseña"}
        </h1>

        {puedeCambiar ? (
          <form onSubmit={guardarPassword} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
              {busy ? "Guardando..." : "GUARDAR CONTRASEÑA"}
            </Button>
          </form>
        ) : enviado ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Revisá tu correo (también la carpeta de spam) y abrí el link que te enviamos para
            crear una contraseña nueva.
          </p>
        ) : (
          <form onSubmit={pedirLink} className="mt-6 flex flex-col gap-4">
            <p className="text-center text-sm text-muted-foreground">
              Te mandamos un link a tu email para que puedas elegir una contraseña nueva.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@email.com"
                required
              />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
              {busy ? "Enviando..." : "ENVIARME EL LINK"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          
        </div>
      </div>
    </main>
  );
}
