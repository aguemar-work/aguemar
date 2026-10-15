import { describe, expect, it } from "vitest";
import { armarDesdePeriodo, bloques, esMesCompleto, periodoMes, textoPeriodo, tituloSugerido, type DatosPeriodo } from "@/lib/informe";
import { informeSchema } from "@/lib/validators/informe";

describe("periodos", () => {
  it("calcula el mes y los meses vecinos (con cambio de año y febrero)", () => {
    expect(periodoMes("2026-10-15")).toEqual({ inicio: "2026-10-01", fin: "2026-10-31" });
    expect(periodoMes("2026-01-20", -1)).toEqual({ inicio: "2025-12-01", fin: "2025-12-31" });
    expect(periodoMes("2028-03-05", -1)).toEqual({ inicio: "2028-02-01", fin: "2028-02-29" });
    expect(periodoMes("2026-12-31", 1)).toEqual({ inicio: "2027-01-01", fin: "2027-01-31" });
  });

  it("nombra el periodo", () => {
    expect(esMesCompleto("2026-09-01", "2026-09-30")).toBe(true);
    expect(textoPeriodo("2026-09-01", "2026-09-30")).toBe("Septiembre 2026");
    expect(textoPeriodo("2026-08-01", "2026-09-30")).toBe("Agosto – septiembre 2026");
    expect(textoPeriodo("2025-12-01", "2026-01-31")).toBe("Diciembre 2025 – enero 2026");
    expect(textoPeriodo("2026-10-01", "2026-10-15")).toBe("01/10/2026 – 15/10/2026");
    expect(tituloSugerido("2026-09-01", "2026-09-30")).toBe("Informe de avance · Septiembre 2026");
  });
});

describe("bloques de texto", () => {
  it("separa párrafos y listas", () => {
    expect(bloques("Intro del mes.\nSigue la intro.\n\n- Uno\n• Dos\n* Tres\nCierre.")).toEqual([
      { tipo: "parrafo", texto: "Intro del mes.\nSigue la intro." },
      { tipo: "lista", items: ["Uno", "Dos", "Tres"] },
      { tipo: "parrafo", texto: "Cierre." },
    ]);
    expect(bloques("")).toEqual([]);
    // Un guion sin espacio no es viñeta (p. ej. un número negativo).
    expect(bloques("-5 % de incidencias")).toEqual([{ tipo: "parrafo", texto: "-5 % de incidencias" }]);
  });
});

const vacio: DatosPeriodo = { tareas_hechas: 0, actividades_hechas: 0, entregados: 0, fichas_total: 0, trabajos: [], actividades: [], fichas: [], proximas: [] };

describe("armar el informe desde el periodo", () => {
  it("sin datos deja solo 'Próximos pasos' vacío", () => {
    const r = armarDesdePeriodo(vacio);
    expect(r.resumen).toBe("");
    expect(r.indicadores).toEqual([]);
    expect(r.secciones).toEqual([{ titulo: "Próximos pasos", texto: "" }]);
  });

  it("arma indicadores, secciones y resumen", () => {
    const r = armarDesdePeriodo({
      ...vacio,
      tareas_hechas: 3,
      actividades_hechas: 1,
      fichas_total: 1,
      trabajos: [{ titulo: "Web corporativa", estado: "en_curso", hechas: 6, total: 8, tareas: ["Maqueta", "Contenido", "Formulario"] }],
      actividades: [{ fecha: "2026-09-10", titulo: "Reunión de avance", tipo: "reunion" }],
      fichas: [{ numero: "FT-2026-002", titular: "Mantenimiento de laptop", fecha: "2026-09-12" }],
      proximas: [{ fecha: "2026-10-05", titulo: "Publicar la web", tipo: "entrega" }],
    });
    expect(r.indicadores).toEqual([
      { valor: "75 %", etiqueta: "Avance del proyecto" },
      { valor: "3", etiqueta: "Tareas completadas" },
      { valor: "1", etiqueta: "Actividad realizada" },
      { valor: "1", etiqueta: "Servicio técnico" },
    ]);
    expect(r.secciones.map((s) => s.titulo)).toEqual(["Trabajo realizado", "Actividades", "Soporte técnico", "Próximos pasos"]);
    expect(r.secciones[0].texto).toBe("Web corporativa — en curso (6/8 tareas)\n- Maqueta\n- Contenido\n- Formulario");
    expect(r.secciones[1].texto).toBe("- 10/09/2026 · Reunión: Reunión de avance");
    expect(r.secciones[3].texto).toBe("- 05/10/2026 · Publicar la web");
    expect(r.resumen).toBe("En este periodo: 3 tareas completadas, 1 actividad realizada y 1 servicio técnico.");
  });

  it("nunca pasa de 4 indicadores", () => {
    const r = armarDesdePeriodo({ ...vacio, tareas_hechas: 2, entregados: 1, actividades_hechas: 2, fichas_total: 2, trabajos: [{ titulo: "A", estado: "entregado", hechas: 2, total: 2, tareas: [] }] });
    expect(r.indicadores).toHaveLength(4);
  });
});

describe("validación del informe", () => {
  const base = {
    cliente_id: "4b0f6c2e-8d2a-4f6e-9a51-0c1d2e3f4a5b",
    trabajo_id: "",
    area: "desarrollo" as const,
    fecha: "2026-10-01",
    titulo: "Informe de avance · Septiembre 2026",
    periodo_inicio: "2026-09-01",
    periodo_fin: "2026-09-30",
    resumen: "",
    indicadores: [{ valor: "3", etiqueta: "Tareas completadas", nota: "" }],
    secciones: [
      { titulo: "Trabajo realizado", texto: "- Maqueta" },
      { titulo: "Próximos pasos", texto: "  " },
    ],
    notas: "",
  };

  it("descarta secciones vacías y normaliza opcionales", () => {
    const r = informeSchema.parse(base);
    expect(r.secciones).toEqual([{ titulo: "Trabajo realizado", texto: "- Maqueta" }]);
    expect(r.trabajo_id).toBeNull();
    expect(r.resumen).toBeNull();
    expect(r.indicadores[0].nota).toBeNull();
  });

  it("rechaza periodos invertidos y más de 4 indicadores", () => {
    const invertido = informeSchema.safeParse({ ...base, periodo_inicio: "2026-10-01", periodo_fin: "2026-09-30" });
    expect(invertido.success).toBe(false);
    expect(invertido.error?.issues[0].path).toEqual(["periodo_fin"]);
    const indicador = { valor: "1", etiqueta: "x", nota: "" };
    expect(informeSchema.safeParse({ ...base, indicadores: Array(5).fill(indicador) }).success).toBe(false);
  });
});
