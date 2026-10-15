/**
 * Tipos y textos compartidos de los documentos (fichas técnicas por ahora).
 * FichaJson es la forma que devuelven ficha_json / ficha_panel / ws_ficha / portal_documento:
 * la usan el detalle del panel, el workspace, el portal y el PDF.
 */
import type { EstadoDiagnostico, EstadoFinalFicha, EstadoIncidencia, ModalidadServicio } from "@/types/database";
import { sumarDias } from "@/lib/format";

export interface MarcaJson {
  nombre_comercial: string;
  responsable: string;
  cargo: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  web: string | null;
  direccion: string | null;
  pago_cuenta: string | null;
  pago_cci: string | null;
  pago_yape: string | null;
  pago_plin: string | null;
}

export interface FichaJson {
  id: string;
  numero: string | null;
  fecha: string;
  tipo_servicio: string;
  modalidad: ModalidadServicio;
  titular: string;
  resumen: string | null;
  estado_final: EstadoFinalFicha;
  indicadores: { valor: string; etiqueta: string }[];
  proximo_mantenimiento: string | null;
  publicada: boolean;
  publicada_en: string | null;
  equipo: {
    marca: string | null;
    modelo: string | null;
    serie: string;
    sistema_operativo: string | null;
    procesador: string | null;
    ram: string | null;
    almacenamiento: string | null;
    grafica: string | null;
    bateria: string | null;
    bios: string | null;
  } | null;
  diagnosticos: { elemento: string; resultado: string; estado: EstadoDiagnostico }[];
  trabajos: { titulo: string; detalle: string | null; hecho: boolean }[];
  incidencias: { titulo: string; causa: string | null; solucion: string | null; estado: EstadoIncidencia }[];
  recomendaciones: string[];
  cliente: { nombre: string; tipo_doc: string | null; num_doc: string | null; contacto: string | null; direccion: string | null };
  marca: MarcaJson | null;
  token: string | null;
}

export const ESTADOS_FINALES: { valor: EstadoFinalFicha; etiqueta: string; variant: "ok" | "warn" | "danger" }[] = [
  { valor: "operativo", etiqueta: "Operativo", variant: "ok" },
  { valor: "operativo_observaciones", etiqueta: "Operativo con observaciones", variant: "warn" },
  { valor: "requiere_reparacion", etiqueta: "Requiere reparación", variant: "danger" },
];

export const ESTADOS_DIAGNOSTICO: { valor: EstadoDiagnostico; etiqueta: string; variant: "ok" | "warn" | "danger" | "default" }[] = [
  { valor: "optimo", etiqueta: "Óptimo", variant: "ok" },
  { valor: "mejorable", etiqueta: "Mejorable", variant: "warn" },
  { valor: "atendido", etiqueta: "Atendido", variant: "default" },
  { valor: "critico", etiqueta: "Crítico", variant: "danger" },
];

export const ESTADOS_INCIDENCIA: { valor: EstadoIncidencia; etiqueta: string; variant: "ok" | "warn" | "default" }[] = [
  { valor: "resuelta", etiqueta: "Resuelta", variant: "ok" },
  { valor: "pendiente", etiqueta: "Pendiente", variant: "warn" },
  { valor: "observacion", etiqueta: "En observación", variant: "default" },
];

export const MODALIDADES: { valor: ModalidadServicio; etiqueta: string }[] = [
  { valor: "remota", etiqueta: "Remota" },
  { valor: "presencial", etiqueta: "Presencial" },
];

export const etiquetaDe = <T extends string>(lista: { valor: T; etiqueta: string }[], valor: T) => lista.find((x) => x.valor === valor)?.etiqueta ?? valor;

/** Próximo mantenimiento sugerido: 6 meses después del servicio. */
export function proximoMantenimientoSugerido(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const objetivo = new Date(Date.UTC(a, m - 1 + 6, 1));
  // Mismo día del mes, o el último día si ese mes es más corto (31/08 → 28/02).
  const ultimo = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(d, ultimo));
  return objetivo.toISOString().slice(0, 10);
}

/** Nombre del equipo para títulos: "Lenovo IdeaPad Pro 5 · PF5Y6DJT". */
export function nombreEquipo(e: { marca: string | null; modelo: string | null; serie?: string | null } | null): string {
  if (!e) return "Sin equipo";
  const nombre = [e.marca, e.modelo].filter(Boolean).join(" ") || "Equipo";
  return e.serie ? `${nombre} · ${e.serie}` : nombre;
}

/** URL pública de un documento. */
export function urlPortal(origen: string, token: string): string {
  return `${origen.replace(/\/$/, "")}/d/${token}`;
}

// Re-exportado para quien arma fechas relativas desde aquí.
export { sumarDias };
