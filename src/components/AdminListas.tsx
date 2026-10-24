import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ordenarOpciones } from "@/components/SelectConOtro";

type Opcion = { id: string; tipo: string; valor: string; activo: boolean; original: boolean };

/** Panel para activar/desactivar individualmente cada zona y cada rubro. */
export function AdminListas() {
  const [tipo, setTipo] = useState<"zona" | "rubro">("zona");
  const [items, setItems] = useState<Opcion[]>([]);

  const cargar = async () => {
    const { data, error } = await supabase.from("opciones_lista").select("*").eq("tipo", tipo);
    if (error) { toast.error("No se pudo cargar la lista."); return; }
    setItems(ordenarOpciones((data ?? []) as Opcion[]));
  };

  useEffect(() => {
    cargar();
  }, [tipo]);

  const alternar = async (o: Opcion) => {
    const { error } = await supabase.from("opciones_lista").update({ activo: !o.activo }).eq("id", o.id);
    if (error) { toast.error("No se pudo cambiar."); return; }
    setItems((l) => l.map((x) => (x.id === o.id ? { ...x, activo: !x.activo } : x)));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant={tipo === "zona" ? "default" : "outline"} onClick={() => setTipo("zona")}>Zonas</Button>
        <Button variant={tipo === "rubro" ? "default" : "outline"} onClick={() => setTipo("rubro")}>Rubros</Button>
      </div>
      <ul className="space-y-2">
        {items.map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded-lg border p-3">
            <span className={o.activo ? "font-medium" : "text-muted-foreground line-through"}>{o.valor}</span>
            <Button size="sm" variant={o.activo ? "outline" : "default"} onClick={() => alternar(o)}>
              {o.activo ? "Desactivar" : "Activar"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
