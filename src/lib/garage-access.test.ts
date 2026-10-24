import { describe, expect, it } from "vitest";
import { canUseGarage } from "./garage-access";

describe("Venta de garage", () => {
  it("permite vender a un comprador registrado sin comercio", () => {
    expect(canUseGarage(true, true, false)).toBe(true);
  });
  it("permite vender a un comercio registrado", () => {
    expect(canUseGarage(true, false, true)).toBe(true);
  });
  it("no permite publicar sin sesión o sin registro", () => {
    expect(canUseGarage(false, true, true)).toBe(false);
    expect(canUseGarage(true, false, false)).toBe(false);
  });
});