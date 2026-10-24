import { RUBROS_DESTACADOS } from "@/lib/rubros";
import { SelectConOtro } from "@/components/SelectConOtro";

type Props = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
};

/** Desplegable de rubros; "Otros" permite escribir y agregar un rubro. */
export function SelectRubro(props: Props) {
  return (
    <SelectConOtro
      {...props}
      base={RUBROS_DESTACADOS}
      tipo="rubro"
      placeholder="Elegí un rubro"
      placeholderOtro="Escribí tu rubro (ej: Jardinería)"
    />
  );
}
