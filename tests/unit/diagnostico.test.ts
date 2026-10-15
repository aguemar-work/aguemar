import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { interpretarDiagnostico, leerDiagnostico, numeroPe } from "@/lib/diagnostico";

const ejemplo = readFileSync(path.join(__dirname, "..", "fixtures", "diagnostico-ejemplo.json"), "utf8");

function leer(texto: string) {
  const r = leerDiagnostico(texto);
  if (!r.ok) throw new Error(r.error);
  return interpretarDiagnostico(r.datos);
}

describe("leerDiagnostico", () => {
  it("acepta el JSON del script aunque traiga BOM y objetos sueltos en vez de listas", () => {
    const r = leerDiagnostico("﻿" + ejemplo);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.discos).toHaveLength(1);
      expect(r.datos.equipo.graficas).toEqual(["NVIDIA GeForce RTX 4050 Laptop GPU"]);
    }
  });
  it("explica qué pasa con textos que no sirven", () => {
    expect(leerDiagnostico("")).toMatchObject({ ok: false });
    expect(leerDiagnostico("{ no es json")).toMatchObject({ ok: false, error: expect.stringContaining("JSON válido") });
    expect(leerDiagnostico('{"hola": 1}')).toMatchObject({ ok: false, error: expect.stringContaining("diagnostico-agueMar.ps1") });
  });
});

describe("interpretarDiagnostico", () => {
  const r = leer(ejemplo);

  it("arma los datos del equipo", () => {
    expect(r.equipo).toMatchObject({
      marca: "Lenovo",
      modelo: "IdeaPad Pro 5 (83LT)",
      serie: "E2E-PRUEBA-01",
      sistema_operativo: "Windows 11 Pro 10.0.26200",
      ram: "32 GB",
      bateria: "BYD LiP 80 000 mWh",
      bios: "RLCN29WW (14/08/2025)",
    });
    expect(r.equipo.almacenamiento).toContain("954 GB");
  });

  it("sugiere estados: SSD sin desgaste y batería al 99,7 % son óptimos", () => {
    const disco = r.diagnosticos.find((d) => d.elemento.startsWith("Disco"));
    expect(disco?.estado).toBe("optimo");
    expect(disco?.resultado).toContain("0 % de desgaste");
    const bateria = r.diagnosticos.find((d) => d.elemento === "Batería");
    expect(bateria).toMatchObject({ estado: "optimo", resultado: "99,7 % de la capacidad de diseño · 392 ciclos" });
  });

  it("propone hasta 4 indicadores para la portada", () => {
    expect(r.indicadores).toEqual([
      { valor: "0 %", etiqueta: "desgaste del SSD" },
      { valor: "99,7 %", etiqueta: "salud de batería · 392 ciclos" },
      { valor: "0", etiqueta: "eventos críticos en 7 días" },
    ]);
  });

  it("marca como mejorable o crítico lo que está mal", () => {
    const malo = JSON.parse(ejemplo);
    malo.discos.desgaste_pct = 62;
    malo.bateria.salud_pct = 71.5;
    malo.volumenes[0].libre_gb = 40;
    malo.seguridad.firewall_activo = false;
    const m = leer(JSON.stringify(malo));
    const estado = (prefijo: string) => m.diagnosticos.find((d) => d.elemento.startsWith(prefijo))?.estado;
    expect(estado("Disco")).toBe("critico");
    expect(estado("Batería")).toBe("mejorable");
    expect(estado("Espacio libre")).toBe("critico");
    expect(estado("Antivirus")).toBe("critico");
  });

  it("avisa cuando falta el desgaste por no ser administrador", () => {
    const sinAdmin = JSON.parse(ejemplo);
    sinAdmin.es_admin = false;
    sinAdmin.discos.desgaste_pct = null;
    const s = leer(JSON.stringify(sinAdmin));
    expect(s.avisos.join(" ")).toContain("administrador");
    expect(s.indicadores.find((i) => i.etiqueta.includes("desgaste"))).toBeUndefined();
  });

  it("formatea números al estilo peruano", () => {
    expect(numeroPe(99.7)).toBe("99,7");
    expect(numeroPe(80000)).toBe("80 000");
    expect(numeroPe(12.0)).toBe("12");
  });
});
