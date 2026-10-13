import type { Area, EstadoTrabajo, Prioridad, TipoEntregable } from "@/types/database";

export const AREAS: { valor: Area; etiqueta: string; rotulo: string }[] = [
  { valor: "diseno", etiqueta: "Diseño", rotulo: "// diseño" },
  { valor: "desarrollo", etiqueta: "Desarrollo", rotulo: "// desarrollo" },
  { valor: "soporte", etiqueta: "Soporte técnico", rotulo: "// soporte" },
];

export function etiquetaArea(area: Area): string {
  return AREAS.find((a) => a.valor === area)?.etiqueta ?? area;
}

export function rotuloArea(area: Area): string {
  return AREAS.find((a) => a.valor === area)?.rotulo ?? `// ${area}`;
}

export const ESTADOS_TRABAJO: { valor: EstadoTrabajo; etiqueta: string; variant: "default" | "warn" | "ok" | "danger" | "outline"; activo: boolean }[] = [
  { valor: "propuesta", etiqueta: "Propuesta", variant: "outline", activo: true },
  { valor: "en_curso", etiqueta: "En curso", variant: "warn", activo: true },
  { valor: "en_revision", etiqueta: "En revisión", variant: "warn", activo: true },
  { valor: "entregado", etiqueta: "Entregado", variant: "ok", activo: false },
  { valor: "cerrado", etiqueta: "Cerrado", variant: "default", activo: false },
  { valor: "cancelado", etiqueta: "Cancelado", variant: "danger", activo: false },
];

/** Estados que cuentan como "trabajo activo" en el inicio y el tablero por defecto. */
export const ESTADOS_ACTIVOS: EstadoTrabajo[] = ESTADOS_TRABAJO.filter((e) => e.activo).map((e) => e.valor);

export function infoEstado(estado: EstadoTrabajo) {
  return ESTADOS_TRABAJO.find((e) => e.valor === estado) ?? ESTADOS_TRABAJO[0];
}

export const PRIORIDADES: { valor: Prioridad; etiqueta: string }[] = [
  { valor: "baja", etiqueta: "Baja" },
  { valor: "media", etiqueta: "Media" },
  { valor: "alta", etiqueta: "Alta" },
];

export const TIPOS_ENTREGABLE: { valor: TipoEntregable; etiqueta: string }[] = [
  { valor: "enlace", etiqueta: "Enlace" },
  { valor: "archivo", etiqueta: "Archivo" },
  { valor: "acceso", etiqueta: "Acceso" },
  { valor: "otro", etiqueta: "Otro" },
];
