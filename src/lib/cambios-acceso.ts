export function prepararCambioAcceso(correo: string, correoActual: string, claveNueva: string) {
  const email = correo.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Ingresá un correo electrónico válido.");
  }
  const cambios: { email?: string; password?: string } = {};
  if (email.toLowerCase() !== correoActual.trim().toLowerCase()) cambios.email = email;
  if (claveNueva) cambios.password = claveNueva;
  return cambios;
}