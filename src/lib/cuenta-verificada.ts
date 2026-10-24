/** A pre-existing session never substitutes for this page's credential check. */
export function cuentaVerificada(usuarioActual: string | undefined, usuarioVerificado: string | null): boolean {
  return Boolean(usuarioActual && usuarioVerificado && usuarioActual === usuarioVerificado);
}