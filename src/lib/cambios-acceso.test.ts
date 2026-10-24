import { describe, expect, it } from "vitest";
import { prepararCambioAcceso } from "./cambios-acceso";

describe("cambios de acceso propios", () => {
  it("permite cambiar el correo sin cambiar la contraseña", () => {
    expect(prepararCambioAcceso(" nuevo@example.com ", "antes@example.com", "")).toEqual({ email: "nuevo@example.com" });
  });
  it("permite cambiar el alias o contraseña sin cambiar el correo", () => {
    expect(prepararCambioAcceso("actual@example.com", "actual@example.com", "nuevo_alias")).toEqual({ password: "nuevo_alias" });
  });
  it("permite cambiar ambos datos juntos", () => {
    expect(prepararCambioAcceso("nuevo@example.com", "actual@example.com", "nuevaClave")).toEqual({ email: "nuevo@example.com", password: "nuevaClave" });
  });
  it("no envía cambios ni una clave vacía cuando no se modificó nada", () => {
    expect(prepararCambioAcceso("actual@example.com", "actual@example.com", "")).toEqual({});
  });
  it("rechaza un correo vacío o inválido", () => {
    expect(() => prepararCambioAcceso("", "actual@example.com", "")).toThrow();
    expect(() => prepararCambioAcceso("sin-correo", "actual@example.com", "")).toThrow();
  });
});