import { describe, expect, it } from "vitest";
import {
  aCentimos,
  formatearCentimos,
  formatearFecha,
  formatearFechaHora,
  formatearMonto,
  sumarDias,
} from "@/lib/format";

describe("montos es-PE", () => {
  it("formatea céntimos con separador de miles y coma decimal", () => {
    expect(formatearCentimos(123450)).toBe("1 234,50");
    expect(formatearCentimos(0)).toBe("0,00");
    expect(formatearCentimos(5)).toBe("0,05");
    expect(formatearCentimos(100000000)).toBe("1 000 000,00");
  });
  it("agrega el símbolo de la moneda", () => {
    expect(formatearMonto(123450)).toBe("S/ 1 234,50");
    expect(formatearMonto(123450, "USD")).toBe("US$ 1 234,50");
  });
  it("maneja negativos", () => {
    expect(formatearCentimos(-1050)).toBe("-10,50");
  });
  it("rechaza no enteros", () => {
    expect(() => formatearCentimos(10.5)).toThrow();
  });
});

describe("aCentimos", () => {
  it("convierte textos con coma o punto", () => {
    expect(aCentimos("1234,50")).toBe(123450);
    expect(aCentimos("1234.5")).toBe(123450);
    expect(aCentimos("1 234,50")).toBe(123450);
    expect(aCentimos(10)).toBe(1000);
    expect(aCentimos("0")).toBe(0);
  });
  it("redondea el tercer decimal", () => {
    expect(aCentimos("1.005")).toBe(101);
    expect(aCentimos("1.004")).toBe(100);
  });
  it("rechaza texto inválido", () => {
    expect(() => aCentimos("abc")).toThrow();
    expect(() => aCentimos("1,2,3")).toThrow();
  });
});

describe("fechas en America/Lima", () => {
  it("formatea dd/mm/aaaa desde una fecha civil", () => {
    expect(formatearFecha("2026-10-09")).toBe("09/10/2026");
    expect(formatearFecha("2026-01-01")).toBe("01/01/2026");
  });
  it("respeta la zona horaria al convertir instantes UTC", () => {
    // 03:30 UTC del 10/10 es 22:30 del 09/10 en Lima (UTC-5)
    expect(formatearFecha("2026-10-10T03:30:00Z")).toBe("09/10/2026");
    expect(formatearFechaHora("2026-10-10T03:30:00Z")).toBe("09/10/2026 22:30");
  });
  it("suma días a una fecha civil", () => {
    expect(sumarDias("2026-10-09", 15)).toBe("2026-10-24");
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
  });
});
