import { describe, expect, it } from "vitest";
import { PASOS, PROYECTOS, SECCIONES, contenidoLanding } from "@/lib/landing-contenido";
import { TEXTOS } from "@/lib/landing-textos";

describe("contenido fijo de la landing", () => {
  it("las secciones van de «sobre mí» a «contacto» y sin ids repetidos", () => {
    expect(SECCIONES[0]?.id).toBe("sobre-mi");
    expect(SECCIONES.at(-1)?.id).toBe("contacto");
    expect(new Set(SECCIONES.map((s) => s.id)).size).toBe(SECCIONES.length);
  });

  it("hay cuatro pasos con título y texto, y el último es el espacio de la empresa", () => {
    expect(PASOS).toHaveLength(4);
    for (const p of PASOS) {
      expect(p.titulo.length).toBeGreaterThan(0);
      expect(p.texto.length).toBeGreaterThan(0);
    }
    expect(PASOS.at(-1)?.titulo).toBe("Tu espacio");
    expect(PASOS.at(-1)?.chips?.length).toBeGreaterThan(0);
  });

  it("los proyectos tienen clave única, solución y stack", () => {
    expect(new Set(PROYECTOS.map((p) => p.clave)).size).toBe(PROYECTOS.length);
    for (const p of PROYECTOS) {
      expect(p.solucion.length).toBeGreaterThan(0);
      expect(p.stack.length).toBeGreaterThan(0);
    }
  });

  it("la landing presenta dos oficios, cada uno con descripción", () => {
    for (const idioma of ["es", "en"] as const) {
      const { bloques } = TEXTOS[idioma].servicios;
      expect(bloques).toHaveLength(2);
      for (const b of bloques) {
        expect(b.texto.length).toBeGreaterThan(40);
        expect(b.chips.length).toBeGreaterThan(0);
      }
    }
  });

  it("el inglés tiene las mismas secciones, pasos y proyectos que el español", () => {
    const es = contenidoLanding("es");
    const en = contenidoLanding("en");
    expect(en.secciones.map((x) => x.id)).toEqual(es.secciones.map((x) => x.id));
    expect(en.pasos).toHaveLength(es.pasos.length);
    expect(en.proyectos.map((p) => p.clave)).toEqual(es.proyectos.map((p) => p.clave));
    for (const [i, p] of en.proyectos.entries()) {
      expect(p.areas).toHaveLength(es.proyectos[i]!.areas.length);
    }
  });

  it("los textos en inglés no repiten los del español (salvo marcas y cifras)", () => {
    const aplanar = (o: unknown, ruta = ""): [string, string][] =>
      typeof o === "string" ? [[ruta, o]] : Array.isArray(o) ? o.flatMap((v, i) => aplanar(v, `${ruta}.${i}`)) : Object.entries(o as object).flatMap(([k, v]) => aplanar(v, `${ruta}.${k}`));
    const es = Object.fromEntries(aplanar(TEXTOS.es));
    const en = Object.fromEntries(aplanar(TEXTOS.en));
    expect(Object.keys(en)).toEqual(Object.keys(es));
    const iguales = Object.keys(es).filter((k) => es[k] === en[k] && es[k]!.length > 12);
    expect(iguales).toEqual([]);
  });
});
