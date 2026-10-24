import { describe, expect, it } from "vitest";
import { validarDatosComercio, type DatosComercio } from "./registro-comercio";

const BIEN: DatosComercio = {
  nombreApellido: "Jorge Pérez", dni: "30123456", cuit: "20301234567",
  nombre_comercio: "Ferretería El Tornillo", rubro: "Ferretería", zona: "Victoria",
  barrio: "Villa Rosa", direccion: "Av. Siempre Viva 742", telefono: "011 4444 4444",
  whatsapp: "+54 9 11 5555 5555", correo: "comercio@email.com", alias: "el_tornillo",
};

describe("Registro de comercios", () => {
  it("acepta el alta sin teléfono de línea", () => {
    expect(validarDatosComercio({ ...BIEN, telefono: "" })).toBe(null);
  });
  it("sigue exigiendo el resto de los casilleros", () => {
    expect(validarDatosComercio({ ...BIEN, nombre_comercio: "" })).toBe("Completá todos los casilleros.");
  });
  it("mantiene los controles de DNI, CUIT, celular y alias", () => {
    expect(validarDatosComercio({ ...BIEN, dni: "123" })).toBe("El DNI debe tener 7 u 8 números.");
    expect(validarDatosComercio({ ...BIEN, cuit: "20301234" })).toBe("El CUIT/CUIL debe tener 11 números.");
    expect(validarDatosComercio({ ...BIEN, whatsapp: "5555" })).toBe("Ingresá un celular válido con código de área.");
    expect(validarDatosComercio({ ...BIEN, alias: "abc" })).toBe("El alias o contraseña debe tener al menos 6 caracteres.");
  });
});
