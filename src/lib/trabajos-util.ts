/** Utilidades puras del módulo Trabajos (testeables sin base de datos). */

export interface Avance {
  hechas: number;
  total: number;
  /** 0..100, entero. Sin tareas = 0. */
  porcentaje: number;
}

export function calcularAvance(tareas: { hecha: boolean }[]): Avance {
  const total = tareas.length;
  const hechas = tareas.filter((t) => t.hecha).length;
  const porcentaje = total === 0 ? 0 : Math.round((hechas / total) * 100);
  return { hechas, total, porcentaje };
}

/**
 * Días que faltan hasta una fecha civil "AAAA-MM-DD" contando desde `hoy` (también civil).
 * Negativo = vencida. null si no hay fecha.
 */
export function diasHasta(fecha: string | null, hoy: string): number | null {
  if (!fecha) return null;
  const [a1, m1, d1] = hoy.split("-").map(Number);
  const [a2, m2, d2] = fecha.split("-").map(Number);
  const t1 = Date.UTC(a1, m1 - 1, d1);
  const t2 = Date.UTC(a2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86_400_000);
}

export function textoVencimiento(fecha: string | null, hoy: string): { texto: string; tono: "ok" | "warn" | "danger" | "muted" } {
  const dias = diasHasta(fecha, hoy);
  if (dias === null) return { texto: "Sin fecha", tono: "muted" };
  if (dias < 0) return { texto: `Vencido hace ${-dias} ${-dias === 1 ? "día" : "días"}`, tono: "danger" };
  if (dias === 0) return { texto: "Vence hoy", tono: "danger" };
  if (dias <= 7) return { texto: `Vence en ${dias} ${dias === 1 ? "día" : "días"}`, tono: "warn" };
  return { texto: `Vence en ${dias} días`, tono: "ok" };
}
