import { ZONAS_CONURBANO } from "@/lib/zonas";
import { SelectConOtro } from "@/components/SelectConOtro";

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
};

/** Desplegable con las zonas del conurbano; "Otros" permite escribir y agregar una zona. */
export function SelectZona(props: Props) {
  return (
    <SelectConOtro
      {...props}
      base={ZONAS_CONURBANO}
      tipo="zona"
      placeholder="Elegí tu zona"
      placeholderOtro="Escribí tu zona"
    />
  );
}
