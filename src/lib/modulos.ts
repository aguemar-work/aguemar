import {
  CalendarDays,
  KanbanSquare,
  FileBarChart,
  FileText,
  Receipt,
  Laptop,
  Inbox,
  type LucideIcon,
} from "lucide-react";

export type ClaveModulo = "calendario" | "proyectos" | "informes" | "documentos" | "cotizaciones" | "equipos" | "solicitudes";

export interface Modulo {
  clave: ClaveModulo;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
  /** Segmento de ruta dentro de /w/[slug]. */
  ruta: string;
  /** Fase en la que el módulo queda operativo en el workspace. */
  fase: number;
}

export const MODULOS: Modulo[] = [
  { clave: "proyectos", etiqueta: "Proyectos", descripcion: "Trabajos visibles con estado, etapas, tareas y entregables.", icono: KanbanSquare, ruta: "proyectos", fase: 4 },
  { clave: "calendario", etiqueta: "Calendario", descripcion: "Actividades planificadas: reuniones, publicaciones, mantenimientos, entregas.", icono: CalendarDays, ruta: "calendario", fase: 8 },
  { clave: "solicitudes", etiqueta: "Solicitudes", descripcion: "La empresa pide trabajos y sigue su estado.", icono: Inbox, ruta: "solicitudes", fase: 8 },
  { clave: "informes", etiqueta: "Informes", descripcion: "Informes de avance publicados, con PDF.", icono: FileBarChart, ruta: "informes", fase: 9 },
  { clave: "documentos", etiqueta: "Documentos", descripcion: "Fichas técnicas, briefs y actas publicadas.", icono: FileText, ruta: "documentos", fase: 7 },
  { clave: "cotizaciones", etiqueta: "Cotizaciones y cobros", descripcion: "Cotizaciones enviadas, aceptación, cobros y saldo.", icono: Receipt, ruta: "cotizaciones", fase: 6 },
  { clave: "equipos", etiqueta: "Equipos", descripcion: "Inventario de equipos con historial de fichas (soporte técnico).", icono: Laptop, ruta: "equipos", fase: 7 },
];

export const CLAVES_MODULO = MODULOS.map((m) => m.clave) as [ClaveModulo, ...ClaveModulo[]];

/** Fase actual del producto: los módulos con fase mayor se muestran como "pronto". */
export const FASE_ACTUAL = 7;

export function infoModulo(clave: string): Modulo | undefined {
  return MODULOS.find((m) => m.clave === clave);
}

export function moduloActivo(modulos: string[] | null | undefined, clave: ClaveModulo): boolean {
  return Array.isArray(modulos) && modulos.includes(clave);
}
