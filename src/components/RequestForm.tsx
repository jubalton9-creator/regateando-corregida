import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type BuyerRequest = {
  id: string;
  detail: string;
  zone: string;
  budget: string;
  photos: string[];
  createdAt: string;
};

type Props = {
  onSubmit: (request: BuyerRequest) => void;
};

const MAX_PHOTOS = 4;

export function RequestForm({ onSubmit }: Props) {
  const [detail, setDetail] = useState("");
  const [zone, setZone] = useState("");
  const [budget, setBudget] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Máximo ${MAX_PHOTOS} fotos por pedido`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    setPhotos((prev) => [...prev, ...picked.map((f) => URL.createObjectURL(f))]);
    toast.success(`${picked.length} foto(s) agregada(s)`);
  }

  function reset() {
    setDetail("");
    setZone("");
    setBudget("");
    setPhotos([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (detail.trim().length < 10) {
      toast.error("Contanos con un poco más de detalle qué estás buscando");
      return;
    }
    setSending(true);
    window.setTimeout(() => {
      onSubmit({
        id: crypto.randomUUID(),
        detail: detail.trim(),
        zone: zone.trim() || "Sin zona indicada",
        budget: budget.trim(),
        photos,
        createdAt: new Date().toISOString(),
      });
      setSending(false);
      reset();
      toast.success("Pedido publicado: buscando vendedores cercanos…");
    }, 700);
  }

  return (
    <form onSubmit={handleSubmit} className="surface-panel rounded-2xl p-6 sm:p-8">
      <div className="space-y-2">
        <Label htmlFor="detail" className="text-base">
          ¿Qué estás buscando comprar?
        </Label>
        <Textarea
          id="detail"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={800}
          placeholder="Ej: Necesito una heladera no frost de 400 litros, color acero, con entrega en 48 hs…"
          className="min-h-40 resize-none bg-background/60 text-base"
        />
        <p className="text-right text-xs text-muted-foreground">{detail.length}/800</p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="zone">Tu zona</Label>
          <Input
            id="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Barrio o ciudad"
            className="bg-background/60"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Presupuesto estimado</Label>
          <Input
            id="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="$ 0"
            inputMode="numeric"
            className="bg-background/60"
          />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <Label>Fotos de referencia (opcional)</Label>
        <div className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <div key={src} className="relative size-20 overflow-hidden rounded-xl border border-border">
              <img src={src} alt={`Referencia ${i + 1}`} className="size-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((s) => s !== src))}
                aria-label="Quitar foto"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Camera className="size-5" />
              Subir
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg" disabled={sending} className="flex-1 font-semibold">
          {sending ? <Loader2 className="animate-spin" /> : <Send />}
          {sending ? "Publicando…" : "Publicar pedido"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            reset();
            toast("Formulario limpio");
          }}
        >
          <Trash2 />
          Limpiar
        </Button>
      </div>
    </form>
  );
}
