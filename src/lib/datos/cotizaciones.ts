import { cache } from "react";
import type { AceptacionRow, CobroRow, CotizacionItemRow, CotizacionRow, EstadoCotizacion } from "@/types/database";
import { conSesion } from "./base";

export type CotizacionResumen = CotizacionRow & {
  clientes: { id: string; nombre: string } | null;
  cobros: { monto: number }[];
};

export interface FiltrosCotizaciones {
  estado?: EstadoCotizacion | "todas";
  cliente?: string;
  q?: string;
}

export async function listarCotizaciones(filtros: FiltrosCotizaciones = {}): Promise<CotizacionResumen[]> {
  const { db } = await conSesion();
  let consulta = db
    .from("cotizaciones")
    .select("*, clientes(id, nombre), cobros(monto)")
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .limit(200);
  // "enviada" incluye las vencidas sin marcar; el filtro fino por vigencia se hace en la página.
  if (filtros.estado && filtros.estado !== "todas") consulta = consulta.eq("estado", filtros.estado);
  if (filtros.cliente) consulta = consulta.eq("cliente_id", filtros.cliente);
  if (filtros.q) consulta = consulta.or(`asunto.ilike.%${filtros.q.replace(/[%,()]/g, " ")}%,numero.ilike.%${filtros.q.replace(/[%,()]/g, " ")}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as CotizacionResumen[];
}

export type CotizacionDetalle = CotizacionRow & {
  clientes: { id: string; nombre: string; tipo_doc: string | null; num_doc: string | null; contacto: string | null; telefono: string | null; correo: string | null; direccion: string | null; slug: string | null; usuario_id: string | null; modulos: string[] } | null;
  trabajos: { id: string; titulo: string; estado: string } | null;
  cotizacion_items: CotizacionItemRow[];
  aceptaciones: AceptacionRow[];
  cobros: CobroRow[];
};

export const obtenerCotizacion = cache(async function obtenerCotizacion(id: string): Promise<CotizacionDetalle | null> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("cotizaciones")
    .select(
      "*, clientes(id, nombre, tipo_doc, num_doc, contacto, telefono, correo, direccion, slug, usuario_id, modulos), trabajos(id, titulo, estado), cotizacion_items(*), aceptaciones(*), cobros(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const c = data as CotizacionDetalle;
  c.cotizacion_items = [...(c.cotizacion_items ?? [])].sort((a, b) => a.orden - b.orden);
  c.cobros = [...(c.cobros ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  c.aceptaciones = [...(c.aceptaciones ?? [])].sort((a, b) => b.aceptado_en.localeCompare(a.aceptado_en));
  return c;
});

export type CobroConRelaciones = CobroRow & { cotizaciones: { id: string; numero: string | null } | null };

export async function cobrosDeCliente(clienteId: string): Promise<CobroConRelaciones[]> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("cobros")
    .select("*, cotizaciones(id, numero)")
    .eq("cliente_id", clienteId)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CobroConRelaciones[];
}

/** Cotizaciones aceptadas de una empresa con lo cobrado, para elegir a qué cotización imputar un cobro. */
export async function cotizacionesParaCobro(clienteId: string): Promise<{ id: string; numero: string | null; asunto: string; total: number; moneda: string }[]> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("cotizaciones")
    .select("id, numero, asunto, total, moneda")
    .eq("cliente_id", clienteId)
    .eq("estado", "aceptada")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as { id: string; numero: string | null; asunto: string; total: number; moneda: string }[];
}

/** Cotización que originó un trabajo (si la hay), con lo cobrado. */
export async function cotizacionDeTrabajo(trabajoId: string): Promise<{ id: string; numero: string | null; total: number; moneda: CotizacionRow["moneda"]; cobrado: number } | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("cotizaciones").select("id, numero, total, moneda, cobros(monto)").eq("trabajo_id", trabajoId).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const c = data as { id: string; numero: string | null; total: number; moneda: CotizacionRow["moneda"]; cobros: { monto: number }[] };
  return { id: c.id, numero: c.numero, total: c.total, moneda: c.moneda, cobrado: c.cobros.reduce((s, k) => s + k.monto, 0) };
}
