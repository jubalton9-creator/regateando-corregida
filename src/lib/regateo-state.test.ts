import { describe, expect, it } from "vitest";
import { REGATEO_SEGUNDOS, regateoCerrado } from "./regateo-state";
describe("Regateo", () => {
  it("da tres minutos para negociar", () => expect(REGATEO_SEGUNDOS).toBe(180));
  it("mantiene abierta una cotización hasta aceptación expresa", () => expect(regateoCerrado("cotizado")).toBe(false));
  it("cierra el trato aceptado", () => expect(regateoCerrado("acordado")).toBe(true));
  it("cierra la oferta desistida", () => expect(regateoCerrado("desistido")).toBe(true));
});