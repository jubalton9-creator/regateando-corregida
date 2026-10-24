import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  photos: File[];
  onChange: (photos: File[]) => void;
};

export function RequestPhotos({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const urls = photos.map((photo) => URL.createObjectURL(photo));
    setPreviews(urls);
    setExpanded(null);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/90 p-4 shadow-sm">
      <p className="text-center text-base font-medium text-foreground">
        Si tenés, subí tus fotos del producto
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={photos.length >= 3}
        onClick={() => inputRef.current?.click()}
        className="h-14 w-full gap-2 rounded-xl border-2 border-dashed bg-muted/50 text-muted-foreground"
      >
        <Plus className="size-5" />
        <span className="text-base font-medium">
          {photos.length >= 3 ? "Límite de 3 fotos alcanzado" : "Agregar foto"}
        </span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        aria-label="Fotos del producto"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
          const room = 3 - photos.length;
          onChange([...photos, ...files.slice(0, room)]);
          if (files.length > room) toast.info("Solo podés subir hasta 3 fotos.");
          event.target.value = "";
        }}
      />
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((src, index) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-lg border border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setExpanded(index)}
                aria-label={`Ampliar foto ${index + 1}`}
                className="h-full w-full cursor-pointer rounded-none p-0"
              >
                <img src={src} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label={`Quitar foto ${index + 1}`}
                onClick={() => onChange(photos.filter((_, i) => i !== index))}
                className="absolute right-1 top-1 size-7 rounded-full bg-background/90"
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Dialog open={expanded !== null} onOpenChange={(open) => { if (!open) setExpanded(null); }}>
        <DialogContent aria-describedby={undefined} className="w-[calc(100%-2rem)] max-w-4xl rounded-lg p-3 pt-12">
          <DialogTitle className="sr-only">Foto ampliada del producto</DialogTitle>
          {expanded !== null && previews[expanded] && (
            <img src={previews[expanded]} alt={`Foto ${expanded + 1} ampliada`} className="max-h-[75dvh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}