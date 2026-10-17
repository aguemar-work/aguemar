import { describe, expect, it } from "vitest";
import { PASOS, PROYECTOS, SECCIONES } from "@/lib/landing-contenido";

describe("contenido fijo de la landing", () => {
  it("las secciones van de «sobre mí» a «contacto» y sin ids repetidos", () => {
    expect(SECCIONES[0]?.id).toBe("sobre-mi");
    expect(SECCIONES.at(-1)?.id).toBe("contacto");
    expect(new Set(SECCIONES.map((s) => s.id)).size).toBe(SECCIONES.length);
  });

  it("hay cuatro pasos con artefacto", () => {
    expect(PASOS).toHaveLength(4);
    for (const p of PASOS) expect(p.artefacto.length).toBeGreaterThan(0);
  });

  it("los proyectos tienen clave única y al menos un punto hecho", () => {
    expect(new Set(PROYECTOS.map((p) => p.clave)).size).toBe(PROYECTOS.length);
    for (const p of PROYECTOS) {
      expect(p.hecho.length).toBeGreaterThan(0);
      expect(p.stack.length).toBeGreaterThan(0);
    }
  });
});
