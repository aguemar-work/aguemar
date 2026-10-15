import { describe, expect, it } from "vitest";
import { leerMes, moverMes, nombreMes, porDia, rangoGrilla, semanasDelMes, textoHoras } from "@/lib/calendario";

describe("semanasDelMes", () => {
  it("octubre 2026 empieza jueves: la grilla arranca el lunes 28/09 y termina el domingo 01/11", () => {
    const s = semanasDelMes(2026, 10);
    expect(s[0][0]).toEqual({ fecha: "2026-09-28", delMes: false, dia: 28 });
    expect(s[0][3]).toEqual({ fecha: "2026-10-01", delMes: true, dia: 1 });
    expect(s.every((sem) => sem.length === 7)).toBe(true);
    expect(s[s.length - 1][6].fecha).toBe("2026-11-01");
  });
  it("febrero 2027 (28 días, empieza lunes) ocupa exactamente 4 semanas", () => {
    const s = semanasDelMes(2027, 2);
    expect(s).toHaveLength(4);
    expect(s[0][0].fecha).toBe("2027-02-01");
  });
  it("el rango de la grilla cubre los días de relleno", () => {
    expect(rangoGrilla(2026, 10)).toEqual({ desde: "2026-09-28", hasta: "2026-11-01" });
  });
});

describe("navegación y textos", () => {
  it("lee el mes del parámetro o usa el de hoy", () => {
    expect(leerMes("2026-12", "2026-10-15")).toEqual({ anio: 2026, mes: 12 });
    expect(leerMes("2026-13", "2026-10-15")).toEqual({ anio: 2026, mes: 10 });
    expect(leerMes(undefined, "2026-10-15")).toEqual({ anio: 2026, mes: 10 });
  });
  it("pasa de año al moverse", () => {
    expect(moverMes(2026, 12, 1)).toEqual({ anio: 2027, mes: 1 });
    expect(moverMes(2026, 1, -1)).toEqual({ anio: 2025, mes: 12 });
  });
  it("nombra el mes en español", () => {
    expect(nombreMes(2026, 10)).toBe("Octubre 2026");
  });
  it("agrupa por día y arma las horas", () => {
    const m = porDia([{ fecha: "2026-10-20" }, { fecha: "2026-10-20T00:00:00Z" }, { fecha: "2026-10-21" }]);
    expect(m.get("2026-10-20")).toHaveLength(2);
    expect(textoHoras("09:00", "10:30")).toBe("09:00–10:30");
    expect(textoHoras("09:00", null)).toBe("09:00");
    expect(textoHoras(null, "10:00")).toBe("");
  });
});
