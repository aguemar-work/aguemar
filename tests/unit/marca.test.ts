import { describe, expect, it } from "vitest";
import { marcaSchema } from "@/lib/validators/marca";
import { marcaIncompleta } from "@/lib/documentos";

const base = {
  nombre_comercial: "aguemar",
  responsable: "Alejandro",
  cargo: "Gerente",
  ruc: "",
  telefono: "",
  correo: "",
  web: "",
  direccion: "",
  igv_porcentaje: 18,
  moneda_default: "PEN" as const,
  validez_dias_default: 15,
  plazo_pago_dias_default: 7,
  condiciones_default: "",
  pago_cuenta: "",
  pago_cci: "",
  pago_yape: "",
  pago_plin: "",
};

describe("Mi marca", () => {
  it("ya no acepta marcadores [PENDIENTE] como RUC o correo", () => {
    expect(marcaSchema.safeParse({ ...base, ruc: "[PENDIENTE: RUC]" }).success).toBe(false);
    expect(marcaSchema.safeParse({ ...base, correo: "[PENDIENTE: correo]" }).success).toBe(false);
    expect(marcaSchema.safeParse(base).success).toBe(true);
  });

  it("dice qué falta para que los documentos salgan completos", () => {
    expect(marcaIncompleta(null)).toEqual(["los datos de Mi marca"]);
    expect(marcaIncompleta({ responsable: "Alejandro", telefono: "", correo: "", ruc: null })).toEqual(["un teléfono o correo de contacto", "el RUC"]);
    expect(marcaIncompleta({ responsable: "Alejandro", telefono: "924262338", correo: null, ruc: "20123456789" })).toEqual([]);
  });
});

describe("Mi marca · campos en blanco", () => {
  it("un guion suelto cuenta como campo vacío", () => {
    const r = marcaSchema.safeParse({ ...base, direccion: "-", web: " – " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.direccion).toBeNull();
      expect(r.data.web).toBeNull();
    }
    const con = marcaSchema.safeParse({ ...base, direccion: "Av. Ejemplo 123 - Lima" });
    expect(con.success && con.data.direccion).toBe("Av. Ejemplo 123 - Lima");
  });
});
