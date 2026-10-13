import { describe, expect, it } from "vitest";
import { calcularAvance, diasHasta, textoVencimiento } from "@/lib/trabajos-util";
import { trabajoSchema, entregableSchema } from "@/lib/validators/trabajo";

describe("calcularAvance", () => {
  it("sin tareas es 0", () => {
    expect(calcularAvance([])).toEqual({ hechas: 0, total: 0, porcentaje: 0 });
  });
  it("redondea el porcentaje", () => {
    expect(calcularAvance([{ hecha: true }, { hecha: false }, { hecha: false }])).toEqual({ hechas: 1, total: 3, porcentaje: 33 });
    expect(calcularAvance([{ hecha: true }, { hecha: true }])).toEqual({ hechas: 2, total: 2, porcentaje: 100 });
  });
});

describe("diasHasta y textoVencimiento", () => {
  const hoy = "2026-10-13";
  it("calcula días con fechas civiles", () => {
    expect(diasHasta("2026-10-13", hoy)).toBe(0);
    expect(diasHasta("2026-10-20", hoy)).toBe(7);
    expect(diasHasta("2026-10-10", hoy)).toBe(-3);
    expect(diasHasta(null, hoy)).toBeNull();
  });
  it("describe el vencimiento", () => {
    expect(textoVencimiento(null, hoy)).toEqual({ texto: "Sin fecha", tono: "muted" });
    expect(textoVencimiento("2026-10-13", hoy)).toEqual({ texto: "Vence hoy", tono: "danger" });
    expect(textoVencimiento("2026-10-12", hoy)).toEqual({ texto: "Vencido hace 1 día", tono: "danger" });
    expect(textoVencimiento("2026-10-16", hoy)).toEqual({ texto: "Vence en 3 días", tono: "warn" });
    expect(textoVencimiento("2026-11-13", hoy)).toEqual({ texto: "Vence en 31 días", tono: "ok" });
  });
});

describe("trabajoSchema", () => {
  const base = {
    area: "desarrollo",
    cliente_id: "",
    titulo: "Sitio web",
    descripcion: "",
    estado: "propuesta",
    prioridad: "media",
    fecha_inicio: "2026-10-01",
    fecha_compromiso: "2026-10-30",
    monto_estimado_texto: "1500,50",
    moneda: "PEN",
    notas: "",
  };
  it("acepta un trabajo válido y normaliza vacíos a null", () => {
    const r = trabajoSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.cliente_id).toBeNull();
      expect(r.data.descripcion).toBeNull();
    }
  });
  it("rechaza fecha comprometida anterior al inicio", () => {
    const r = trabajoSchema.safeParse({ ...base, fecha_compromiso: "2026-09-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["fecha_compromiso"]);
  });
  it("rechaza monto inválido y título corto", () => {
    expect(trabajoSchema.safeParse({ ...base, monto_estimado_texto: "abc" }).success).toBe(false);
    expect(trabajoSchema.safeParse({ ...base, titulo: "ab" }).success).toBe(false);
  });
});

describe("entregableSchema", () => {
  it("exige http(s) en el enlace", () => {
    expect(entregableSchema.safeParse({ nombre: "Figma", tipo: "enlace", url: "figma.com/x" }).success).toBe(false);
    expect(entregableSchema.safeParse({ nombre: "Figma", tipo: "enlace", url: "https://figma.com/x" }).success).toBe(true);
    expect(entregableSchema.safeParse({ nombre: "Acceso", tipo: "acceso", url: "" }).success).toBe(true);
  });
});
