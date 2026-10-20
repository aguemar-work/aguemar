import { describe, expect, it } from "vitest";
import { aCantidad, calcularTotales, estadoEfectivo, estadoPago, fechaVence, importeLinea, nombreArchivo, saldo } from "@/lib/cotizacion";
import { pagoCotizacionSchema } from "@/lib/validators/cotizacion";

describe("importeLinea", () => {
  it("multiplica, redondea a céntimos y resta el descuento", () => {
    expect(importeLinea(1, 150000)).toBe(150000);
    expect(importeLinea(2.5, 33333, 1000)).toBe(82333); // 83332,5 → 83333 − 1000
  });
  it("nunca es negativo y es 0 sin cantidad válida", () => {
    expect(importeLinea(1, 1000, 5000)).toBe(0);
    expect(importeLinea(0, 1000)).toBe(0);
    expect(importeLinea(Number.NaN, 1000)).toBe(0);
  });
});

describe("calcularTotales (mismos valores que la base)", () => {
  it("IGV sumado: 2 323,33 + 18 % = 2 741,53", () => {
    expect(calcularTotales([150000, 82333], 1800, "sumar")).toEqual({ subtotal: 232333, igv: 41820, total: 274153 });
  });
  it("IGV incluido: 2 323,33 se desglosa en 1 968,92 + 354,41", () => {
    expect(calcularTotales([150000, 82333], 1800, "incluido")).toEqual({ subtotal: 196892, igv: 35441, total: 232333 });
  });
  it("sin líneas todo es cero", () => {
    expect(calcularTotales([], 1800, "sumar")).toEqual({ subtotal: 0, igv: 0, total: 0 });
  });
  it("IGV 0 % no agrega nada", () => {
    expect(calcularTotales([10000], 0, "sumar")).toEqual({ subtotal: 10000, igv: 0, total: 10000 });
  });
});

describe("cantidades, vencimiento y saldo", () => {
  it("acepta coma o punto con hasta 3 decimales", () => {
    expect(aCantidad("2,5")).toBe(2.5);
    expect(aCantidad("1.125")).toBe(1.125);
    expect(aCantidad("1,1234")).toBeNaN();
    expect(aCantidad("")).toBeNaN();
  });
  it("calcula la fecha de vencimiento y el estado efectivo", () => {
    expect(fechaVence("2026-10-14", 15)).toBe("2026-10-29");
    expect(estadoEfectivo({ estado: "enviada", fecha: "2026-10-01", validez_dias: 15 }, "2026-10-20")).toBe("vencida");
    expect(estadoEfectivo({ estado: "enviada", fecha: "2026-10-10", validez_dias: 15 }, "2026-10-20")).toBe("enviada");
    expect(estadoEfectivo({ estado: "aceptada", fecha: "2026-01-01", validez_dias: 1 }, "2026-10-20")).toBe("aceptada");
  });
  it("el saldo nunca es negativo", () => {
    expect(saldo(274153, 100000)).toBe(174153);
    expect(saldo(1000, 5000)).toBe(0);
  });
  it("arma el nombre del PDF sin tildes ni espacios", () => {
    expect(nombreArchivo("COT-2026-001", "SGC")).toBe("COT-2026-001_SGC.pdf");
    expect(nombreArchivo("COT-2026-002", "Belmán Group S.A.C.")).toBe("COT-2026-002_Belman-Group-S-A-C.pdf");
  });
});

describe("estado del pago", () => {
  const hoy = "2026-10-19";
  it("pagada, por vencer, vence hoy y vencida", () => {
    expect(estadoPago({ pendiente: 0, vence_pago: "2026-10-01" }, hoy)).toEqual({ texto: "Pagada", tono: "ok" });
    expect(estadoPago({ pendiente: 100, vence_pago: "2026-10-30" }, hoy)).toEqual({ texto: "Vence en 11 días", tono: "ok" });
    expect(estadoPago({ pendiente: 100, vence_pago: "2026-10-22" }, hoy)).toEqual({ texto: "Vence en 3 días", tono: "warn" });
    expect(estadoPago({ pendiente: 100, vence_pago: "2026-10-19" }, hoy)).toEqual({ texto: "Vence hoy", tono: "warn" });
    expect(estadoPago({ pendiente: 100, vence_pago: "2026-10-18" }, hoy)).toEqual({ texto: "Vencida hace 1 día", tono: "danger" });
    expect(estadoPago({ pendiente: 100, vence_pago: "2026-10-04" }, hoy)).toEqual({ texto: "Vencida hace 15 días", tono: "danger" });
  });

  it("valida plazo y recordatorios", () => {
    expect(pagoCotizacionSchema.safeParse({ plazo_pago_dias: 0 }).success).toBe(true);
    expect(pagoCotizacionSchema.safeParse({ recordar_pago: false }).success).toBe(true);
    expect(pagoCotizacionSchema.safeParse({ plazo_pago_dias: 121 }).success).toBe(false);
    expect(pagoCotizacionSchema.safeParse({ plazo_pago_dias: 1.5 }).success).toBe(false);
    expect(pagoCotizacionSchema.safeParse({}).success).toBe(false);
  });
});
