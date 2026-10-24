import { describe, expect, it } from "vitest";
import { cancellationTokenHash, pedidoDesistido } from "./pedido-state";

describe("Desistir de una compra", () => {
  it("cierra la negociación cuando el comprador desiste", () => {
    expect(pedidoDesistido("desistido")).toBe(true);
    expect(pedidoDesistido("pendiente")).toBe(false);
    expect(pedidoDesistido("cotizado")).toBe(false);
  });
  it("no permite cancelar usando la autorización de otro pedido", async () => {
    expect(await cancellationTokenHash("pedido-uno")).not.toBe(await cancellationTokenHash("pedido-dos"));
    expect(await cancellationTokenHash("pedido-uno")).toBe(await cancellationTokenHash("pedido-uno"));
  });
});