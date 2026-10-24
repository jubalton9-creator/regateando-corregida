export type DatosComercio = {
  nombreApellido: string; dni: string; cuit: string; nombre_comercio: string; rubro: string;
  zona: string; barrio: string; direccion: string; telefono: string; whatsapp: string;
  correo: string; alias: string;
};

/** Único casillero que puede quedar vacío: el teléfono de línea. */
const OPCIONALES: (keyof DatosComercio)[] = ["telefono"];

/** Devuelve el mensaje de error a mostrar, o null si el formulario está conforme. */
export function validarDatosComercio(d: DatosComercio): string | null {
  const obligatorios = (Object.keys(d) as (keyof DatosComercio)[]).filter((k) => !OPCIONALES.includes(k));
  if (obligatorios.some((k) => !d[k].trim())) return "Completá todos los casilleros.";
  const dni = d.dni.replace(/\D/g, "");
  const cuit = d.cuit.replace(/\D/g, "");
  const cel = d.whatsapp.replace(/\D/g, "");
  if (dni.length < 7 || dni.length > 8) return "El DNI debe tener 7 u 8 números.";
  if (cuit.length !== 11) return "El CUIT/CUIL debe tener 11 números.";
  if (cel.length < 10) return "Ingresá un celular válido con código de área.";
  if (d.alias.length < 6) return "El alias o contraseña debe tener al menos 6 caracteres.";
  return null;
}
