import { cache } from "react";
import type { EstadoActividad, ItemCalendario, TipoActividad } from "@/lib/calendario";
import type { Area, Prioridad } from "@/types/database";
import { conSesion } from "./base";

/** Actividades, entregas y mantenimientos del rango (una llamada: panel_calendario). */
export async function calendarioPanel(desde: string, hasta: string): Promise<(ItemCalendario & { cliente_id: string | null; visible_empresa: boolean })[]> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("panel_calendario", { p_desde: desde, p_hasta: hasta });
  if (error) throw error;
  return (data ?? []) as (ItemCalendario & { cliente_id: string | null; visible_empresa: boolean })[];
}

export interface ActividadFila {
  id: string;
  cliente_id: string | null;
  trabajo_id: string | null;
  titulo: string;
  descripcion: string | null;
  tipo: TipoActividad;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  lugar: string | null;
  estado: EstadoActividad;
  visible_empresa: boolean;
  notas: string | null;
  clientes: { id: string; nombre: string } | null;
}

export const obtenerActividad = cache(async function obtenerActividad(id: string): Promise<ActividadFila | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("actividades").select("*, clientes(id, nombre)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const a = data as ActividadFila;
  // Postgres devuelve "09:00:00"; el input type=time usa "09:00".
  return { ...a, hora_inicio: a.hora_inicio?.slice(0, 5) ?? null, hora_fin: a.hora_fin?.slice(0, 5) ?? null };
});

export interface SolicitudFila {
  id: string;
  cliente_id: string;
  titulo: string;
  descripcion: string | null;
  area: Area | null;
  prioridad: Prioridad;
  fecha_deseada: string | null;
  estado: "nueva" | "en_revision" | "aceptada" | "rechazada";
  respuesta: string | null;
  trabajo_id: string | null;
  cotizacion_id: string | null;
  created_at: string;
  clientes: { id: string; nombre: string } | null;
}

/** Solicitudes para la bandeja: abiertas (nuevas y en revisión) o todas. */
export async function listarSolicitudes(soloAbiertas = true): Promise<SolicitudFila[]> {
  const { db } = await conSesion();
  let consulta = db.from("solicitudes").select("*, clientes(id, nombre)").order("created_at", { ascending: false }).limit(100);
  if (soloAbiertas) consulta = consulta.in("estado", ["nueva", "en_revision"]);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as SolicitudFila[];
}
