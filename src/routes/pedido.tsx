import { useState, useEffect } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { RequestPhotos } from "@/components/RequestPhotos";
import { canUseGarage } from "@/lib/garage-access";
import collageAsset from "@/assets/collage-productos.png.asset.json";

type Mode = "comprar" | "vender";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const Route = createFileRoute("/pedido")({
  head: () => ({
    meta: [
      { title: "Comprar y Venta de garage | Regateando" },
      {
        name: "description",
        content:
          "Contanos qué producto estás buscando o publicá uno para vender. Regateando conecta compradores y vendedores de la zona.",
      },
      { property: "og:title", content: "Pedí o vendé tu producto | Regateando" },
      {
        property: "og:description",
        content: "Comprá o vendé productos en Victoria, San Fernando y Tigre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidoPage,
});

function PedidoPage() {
  const [mode, setMode] = useState<Mode>("comprar");

  // Comprador
  const [product, setProduct] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");


  // Vendedor
  const [sellerProduct, setSellerProduct] = useState("");
  const [sellerPrice, setSellerPrice] = useState("");
  const [sellerPhotos, setSellerPhotos] = useState<File[]>([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const [garageAllowed, setGarageAllowed] = useState(false);
  const [checkingGarage, setCheckingGarage] = useState(false);

  const { user } = useSession();
  const router = useRouter();

  useEffect(() => router.subscribe("onBeforeNavigate", ({ toLocation }) => {
    if (toLocation.pathname === "/pedido") return;
    setProduct("");
    setPhotos([]);
    setSellerProduct("");
    setSellerPrice("");
    setSellerPhotos([]);
    setBuyerName(null);
    setGuestName("");
    if (user) void supabase.auth.signOut();
  }), [router, user]);

  useEffect(() => {
    if (mode !== "vender" || !user) {
      setGarageAllowed(false);
      setCheckingGarage(false);
      return;
    }
    let cancelled = false;
    setGarageAllowed(false);
    setCheckingGarage(true);
    Promise.all([
      supabase.from("compradores").select("id").eq("user_id", user.id).limit(1),
      supabase.from("vendedores").select("id").eq("owner_id", user.id).limit(1),
      supabase.from("suppliers").select("id").eq("owner_id", user.id).limit(1),
    ]).then(([buyers, sellers, suppliers]) => {
      if (cancelled) return;
      setGarageAllowed(canUseGarage(true, !!buyers.data?.length, !!sellers.data?.length || !!suppliers.data?.length));
      setCheckingGarage(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, user]);

  useEffect(() => {
    if (!user) {
      setBuyerName(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("compradores")
      .select("nombre, apellido")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const nombre = [data?.nombre, data?.apellido].filter(Boolean).join(" ").trim();
        setBuyerName(nombre || null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Deja la página en blanco y cierra la sesión: el próximo comprador entra limpio.
  const resetearComprador = () => {
    setProduct("");
    setPhotos([]);
    setBuyerName(null);
    setGuestName("");
    setSellerProduct("");
    setSellerPrice("");
    setSellerPhotos([]);
    if (user) void supabase.auth.signOut();
  };

  const handleBuyerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) {
      toast.error("Por favor escribí qué producto necesitás.");
      return;
    }
    const submittedProduct = product;
    const submittedName = buyerName || guestName.trim();
    if (!submittedName) {
      toast.error("Escribí tu nombre para personalizar el pedido.");
      return;
    }
    const submittedPhotos = photos;
    setLoading(true);
    resetearComprador();
    try {
      const fotos = await Promise.all(submittedPhotos.map(fileToDataUrl));
      const payload = { detalle: submittedProduct, fotos, startTime: Date.now(), buyerName: submittedName };
      sessionStorage.setItem("regateando-pending-request", JSON.stringify(payload));
      toast.success("Pedido preparado.");
    } catch {
      toast.error("No pudimos preparar tu pedido. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSellerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerProduct.trim()) {
      toast.error("Por favor escribí el nombre del producto.");
      return;
    }
    const price = Number(sellerPrice);
    if (!Number.isSafeInteger(price) || price <= 0) {
      toast.error("Por favor ingresá un precio base válido.");
      return;
    }
    if (!user) {
      toast.error("Para vender primero tenés que ingresar a tu cuenta.");
      return;
    }
    if (!garageAllowed) {
      toast.error("Para vender tenés que estar registrado como particular o comercio.");
      return;
    }
    const submittedProduct = sellerProduct.trim();
    const submittedPhotos = sellerPhotos;
    setSellerProduct("");
    setSellerPrice("");
    setSellerPhotos([]);
    setSellerLoading(true);
    try {
      const photos = await Promise.all(submittedPhotos.map(fileToDataUrl));
      const { error } = await supabase.from("garage_products").insert({
        owner_id: user.id,
        name: submittedProduct,
        price,
        photos,
      });
      if (error) throw error;
      toast.success("Producto guardado en Venta de garage.");
    } catch {
      toast.error("No se pudo guardar el producto. Probá de nuevo.");
    } finally {
      setSellerLoading(false);
    }
    setSellerProduct("");
    setSellerPrice("");
  };

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden px-5">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.25]"
        style={{
          backgroundImage: `url(${collageAsset.url})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-0 bg-white/70" />

      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-end gap-3 pt-5 text-sm">
        {user ? (
          <>
            
            <span className="text-muted-foreground">{user.email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="font-medium text-primary underline"
            >
              Salir
            </button>
          </>
        ) : (
          <>
            
          </>
        )}
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-6 py-8">
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            onClick={() => setMode("comprar")}
            className={`rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
              mode === "comprar"
                ? "border-primary bg-primary text-white"
                : "border-border bg-white/90 text-foreground hover:bg-muted"
            }`}
          >
            ¿QUERÉS COMPRAR?
          </Button>
          <Button
            type="button"
            onClick={() => setMode("vender")}
            className={`h-auto min-h-12 whitespace-normal rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
              mode === "vender"
                ? "border-primary bg-primary text-white"
                : "border-border bg-white/90 text-foreground hover:bg-muted"
            }`}
          >
            Compra - Venta de garage
          </Button>
        </div>

        {mode === "comprar" ? (
          <form onSubmit={handleBuyerSubmit} className="flex flex-col gap-6">
            {!buyerName && <div className="space-y-2">
              <label htmlFor="buyer-name" className="text-sm font-medium">Tu nombre</label>
              <Input id="buyer-name" value={guestName} onChange={(e) => setGuestName(e.target.value)} required maxLength={150} autoComplete="given-name" />
            </div>}
            {user && buyerName && (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-center">
                <p className="text-sm font-semibold text-primary">
                  ¡Hola, {buyerName.split(" ")[0]}! Bienvenido de nuevo.
                </p>
                <p className="text-xs text-primary/80">
                  Dale con tu pedido cuando quieras.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-6">
              <textarea
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="Hola, contanos qué estás buscando. Cuanto más detalles des, más rápido lo encontraremos."
                className="h-40 w-full resize-none rounded-xl border border-border bg-white/90 p-5 text-center text-lg leading-relaxed shadow-sm placeholder:text-lg placeholder:font-medium placeholder:text-muted-foreground/80 focus:border-primary focus:outline-none"
              />

              <RequestPhotos photos={photos} onChange={setPhotos} />
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-lg text-base font-semibold tracking-wide shadow-md"
              >
                {loading ? "BUSCANDO..." : "ENVIAR"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSellerSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-white/90 p-5 shadow-sm">
              <div className="flex flex-col gap-2">
                <label htmlFor="seller-product" className="text-sm font-medium text-foreground">
                  Producto
                </label>
                <Input
                  id="seller-product"
                  value={sellerProduct}
                  onChange={(e) => setSellerProduct(e.target.value)}
                  placeholder="Ej: Heladera Patrick 410L"
                  className="h-12 rounded-xl border-border bg-white text-base"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="seller-price" className="text-sm font-medium text-foreground">
                  Precio base
                </label>
                <Input
                  id="seller-price"
                  type="number"
                  min={1}
                  value={sellerPrice}
                  onChange={(e) => setSellerPrice(e.target.value)}
                  placeholder="Ej: 150000"
                  className="h-12 rounded-xl border-border bg-white text-base"
                />
                <p className="text-xs text-muted-foreground">Precio en ARS. Sin centavos.</p>
              </div>
              <RequestPhotos photos={sellerPhotos} onChange={setSellerPhotos} />
              {!user && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  Para publicar tenés que ingresar a tu cuenta.
                </p>
              )}
              {user && !garageAllowed && !checkingGarage && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
                  Registrate como particular o comercio para publicar.
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <Button
                type="submit"
                disabled={sellerLoading || checkingGarage || !user || !garageAllowed}
                className="h-14 w-full rounded-lg text-base font-semibold tracking-wide shadow-md"
              >
                {sellerLoading ? "GUARDANDO..." : "GUARDAR PRODUCTO"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Comisión del 5% sobre el precio final de venta.
              </p>
            </div>
          </form>
        )}

        
      </div>
    </main>
  );
}
