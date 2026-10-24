export const REGATEO_SEGUNDOS = 180;
export function regateoCerrado(status: string) {
  return ["desistido", "acordado", "cerrado_vendedor", "no_tengo"].includes(status);
}