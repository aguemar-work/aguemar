import type { Area, EntidadComentario, EstadoTrabajo, Moneda, Prioridad } from "@/types/database";
import { conSesion } from "./base";

/** Lo que devuelve la función SQL panel_resumen(): todo el inicio en una sola llamada. */
export interface ResumenInicio {
  hoy: string;
  por_area: Record<Area, number>;
  por_estado: Record<Extract<EstadoTrabajo, "propuesta" | "en_curso" | "en_revision">, number>;
  entregas_vencidas: number;
  entregas_semana: number;
  entregas: {
    id: string;
    titulo: string;
    area: Area;
    estado: EstadoTrabajo;
    prioridad: Prioridad;
    fecha_compromiso: string;
    empresa: string | null;
    tareas_hechas: number;
    tareas_total: number;
  }[];
  tareas_vencidas: number;
  detenidos: { id: string; titulo: string; area: Area; empresa: string | null; ultima_actividad: string }[];
  comentarios_sin_leer: number;
  comentarios: { id: string; entidad: EntidadComentario; entidad_id: string; texto: string; created_at: string; empresa: string; titulo: string | null }[];
  cotizaciones_sin_respuesta: number;
  cotizaciones_borrador: number;
  cotizaciones: { id: string; numero: string | null; asunto: string; total: number; moneda: Moneda; fecha: string; vence: string; empresa: string }[];
  aceptado_mes: number;
  por_cobrar: number;
  deudores: { cliente_id: string; empresa: string; moneda: Moneda; aceptado: number; cobrado: number; saldo: number }[];
  mantenimientos: { id: string; numero: string | null; proximo_mantenimiento: string; empresa: string; modelo: string | null; serie: string | null }[];
  solicitudes_nuevas: number;
  solicitudes: { id: string; titulo: string; empresa: string; created_at: string }[];
  agenda: { id: string; titulo: string; tipo: string; fecha: string; hora_inicio: string | null; empresa: string | null }[];
  leads_nuevos: number;
  empresas: number;
  empresas_con_acceso: number;
}

export async function resumenInicio(): Promise<ResumenInicio> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("panel_resumen");
  if (error) throw error;
  return data as ResumenInicio;
}
