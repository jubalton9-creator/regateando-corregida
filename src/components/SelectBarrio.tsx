import { useState } from "react";
import { Input } from "@/components/ui/input";
import { barriosDe } from "@/lib/barrios";

type Props = { id?: string; zona: string; value: string; onChange: (v: string) => void; required?: boolean };

const OTRO = "__otro__";

/** Desplegable con los barrios de la zona elegida; "Otro" permite escribirlo. */
export function SelectBarrio({ id, zona, value, onChange, required }: Props) {
  const lista = barriosDe(zona);
  const [otro, setOtro] = useState(false);
  const enLista = lista.includes(value);
  const escribir = otro || (!!value && !enLista) || (!!zona && lista.length === 0);

  return (
    <div className="flex flex-col gap-2">
      <select
        id={id}
        required={required && !escribir}
        disabled={!zona}
        value={escribir ? OTRO : value}
        onChange={(e) => {
          if (e.target.value === OTRO) { setOtro(true); onChange(""); }
          else { setOtro(false); onChange(e.target.value); }
        }}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
      >
        <option value="">{zona ? "Elegí tu barrio" : "Primero elegí la zona"}</option>
        {lista.map((b) => <option key={b} value={b}>{b}</option>)}
        {zona && <option value={OTRO}>Otro (escribir)</option>}
      </select>
      {escribir && (
        <Input required={required} placeholder="Escribí tu barrio" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
