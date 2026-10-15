/**
 * Utilidades del calendario (puras, testeables): semanas de un mes empezando en
 * lunes, navegación entre meses y textos de tipos y estados de actividad.
 */
export type TipoActividad = "trabajo" | "reunion" | "publicacion" | "mantenimiento" | "entrega" | "otro";
export type EstadoActividad = "planificada" | "hecha" | "cancelada";

/** Lo que pintan las vistas de mes y lista (panel y workspace). */
export interface ItemCalendario {
  id: string;
  /** actividad: editable; entrega: fecha comprometida de un trabajo; mantenimiento: sugerido por una ficha. */
  origen: "actividad" | "entrega" | "mantenimiento";
  tipo: TipoActividad;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: EstadoActividad;
  empresa?: string | null;
  lugar?: string | null;
  trabajo_id?: string | null;
}

export const TIPOS_ACTIVIDAD: { valor: TipoActividad; etiqueta: string; punto: string }[] = [
  { valor: "trabajo", etiqueta: "Trabajo planificado", punto: "bg-mint-ink dark:bg-mint" },
  { valor: "reunion", etiqueta: "Reunión", punto: "bg-sky-600 dark:bg-sky-400" },
  { valor: "publicacion", etiqueta: "Publicación", punto: "bg-fuchsia-600 dark:bg-fuchsia-400" },
  { valor: "mantenimiento", etiqueta: "Mantenimiento", punto: "bg-amber-600 dark:bg-amber-400" },
  { valor: "entrega", etiqueta: "Entrega", punto: "bg-danger dark:bg-red-400" },
  { valor: "otro", etiqueta: "Otro", punto: "bg-muted-foreground" },
];

export const ESTADOS_ACTIVIDAD: { valor: EstadoActividad; etiqueta: string }[] = [
  { valor: "planificada", etiqueta: "Planificada" },
  { valor: "hecha", etiqueta: "Hecha" },
  { valor: "cancelada", etiqueta: "Cancelada" },
];

export const infoTipo = (t: string) => TIPOS_ACTIVIDAD.find((x) => x.valor === t) ?? TIPOS_ACTIVIDAD[TIPOS_ACTIVIDAD.length - 1];

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** "2026-10" (o vacío/inválido → el mes de `hoy`). */
export function leerMes(param: string | undefined, hoy: string): { anio: number; mes: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(param ?? "");
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { anio: Number(m[1]), mes: Number(m[2]) };
  const [a, mm] = hoy.split("-").map(Number);
  return { anio: a, mes: mm };
}

export const claveMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, "0")}`;

export function moverMes(anio: number, mes: number, delta: number): { anio: number; mes: number } {
  const d = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

export function nombreMes(anio: number, mes: number): string {
  const n = MESES[mes - 1];
  return `${n.charAt(0).toUpperCase()}${n.slice(1)} ${anio}`;
}

/** Semanas completas (lunes a domingo) que cubren el mes; cada día sabe si es del mes. */
export function semanasDelMes(anio: number, mes: number): { fecha: string; delMes: boolean; dia: number }[][] {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const desfase = (primero.getUTCDay() + 6) % 7; // lunes = 0
  const inicio = new Date(Date.UTC(anio, mes - 1, 1 - desfase));
  const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  const totalDias = Math.ceil((desfase + ultimo) / 7) * 7;
  const semanas: { fecha: string; delMes: boolean; dia: number }[][] = [];
  for (let i = 0; i < totalDias; i++) {
    const d = new Date(inicio.getTime() + i * 86_400_000);
    if (i % 7 === 0) semanas.push([]);
    semanas[semanas.length - 1].push({ fecha: iso(d), delMes: d.getUTCMonth() === mes - 1, dia: d.getUTCDate() });
  }
  return semanas;
}

/** Rango de fechas que muestra la grilla del mes (incluye los días de relleno). */
export function rangoGrilla(anio: number, mes: number): { desde: string; hasta: string } {
  const s = semanasDelMes(anio, mes);
  return { desde: s[0][0].fecha, hasta: s[s.length - 1][6].fecha };
}

/** Agrupa por fecha conservando el orden. */
export function porDia<T extends { fecha: string }>(items: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const f = it.fecha.slice(0, 10);
    m.set(f, [...(m.get(f) ?? []), it]);
  }
  return m;
}

/** "09:00–10:30", "09:00" o "" */
export function textoHoras(inicio: string | null | undefined, fin: string | null | undefined): string {
  if (!inicio) return "";
  return fin ? `${inicio}–${fin}` : inicio;
}
