import { describe, expect, it } from "vitest";
import { cuentaVerificada } from "./cuenta-verificada";

describe("verificación obligatoria de Mi cuenta", () => {
  it("no muestra datos con una sesión abierta sin verificar credenciales en la página", () => {
    expect(cuentaVerificada("usuario-a", null)).toBe(false);
  });
  it("habilita los datos solo para la identidad cuyas credenciales se verificaron", () => {
    expect(cuentaVerificada("usuario-a", "usuario-a")).toBe(true);
    expect(cuentaVerificada("usuario-b", "usuario-a")).toBe(false);
  });
  it("oculta datos cuando la sesión se cierra", () => {
    expect(cuentaVerificada(undefined, "usuario-a")).toBe(false);
  });
});