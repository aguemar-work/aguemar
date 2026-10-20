import { cache } from "react";
import type { ClienteRow, EquipoRow, FichaRow, CotizacionRow, TrabajoRow, CobroRow } from "@/types/database";
import { conSesion, conSesionPanel } from "./base";
import { filtroOr } from "./busqueda";

export interface ClienteResumen extends ClienteRow {
  equipos: { count: number }[];
  /** Invitación de empresa pendiente (sin usar ni revocar), para el estado del acceso. */
  invitacion: { expira_en: string } | null;
}

export async function listarClientes(busqueda?: string): Promise<ClienteResumen[]> {
  const { db } = await conSesion();
  let consulta = db
    .from("clientes")
    .select("*, equipos(count)")
    .order("nombre", { ascending: true })
    .limit(200);
  const q = busqueda?.trim();
  if (q) {
    consulta = consulta.or(filtroOr(q, ["nombre", "num_doc", "contacto"]));
  }
  const [lista, invitaciones] = await Promise.all([
    consulta,
    db.from("invitaciones").select("cliente_id, expira_en").eq("tipo", "empresa").is("usada_en", null).eq("revocada", false).limit(500),
  ]);
  if (lista.error) throw lista.error;
  if (invitaciones.error) throw invitaciones.error;
  const pendientes = new Map(((invitaciones.data ?? []) as { cliente_id: string; expira_en: string }[]).map((i) => [i.cliente_id, { expira_en: i.expira_en }]));
  return ((lista.data ?? []) as Omit<ClienteResumen, "invitacion">[]).map((c) => ({ ...c, invitacion: pendientes.get(c.id) ?? null }));
}

export const obtenerCliente = cache(async function obtenerCliente(id: string): Promise<ClienteRow | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ClienteRow | null) ?? null;
});

export interface HistorialCliente {
  trabajos: (TrabajoRow & { trabajo_tareas: { hecha: boolean }[] })[];
  equipos: EquipoRow[];
  fichas: FichaRow[];
  cotizaciones: CotizacionRow[];
  cobros: (CobroRow & { cotizaciones: { numero: string | null } | null })[];
}

export async function historialCliente(id: string): Promise<HistorialCliente> {
  const { db } = await conSesion();
  const [trabajos, equipos, fichas, cotizaciones, cobros] = await Promise.all([
    db.from("trabajos").select("*, trabajo_tareas(hecha)").eq("cliente_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("equipos").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
    db.from("fichas").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).limit(50),
    db.from("cotizaciones").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).limit(50),
    db.from("cobros").select("*, cotizaciones(numero)").eq("cliente_id", id).order("fecha", { ascending: false }).limit(100),
  ]);
  for (const r of [trabajos, equipos, fichas, cotizaciones, cobros]) {
    if (r.error) throw r.error;
  }
  return {
    trabajos: (trabajos.data ?? []) as HistorialCliente["trabajos"],
    equipos: (equipos.data ?? []) as EquipoRow[],
    fichas: (fichas.data ?? []) as FichaRow[],
    cotizaciones: (cotizaciones.data ?? []) as CotizacionRow[],
    cobros: (cobros.data ?? []) as HistorialCliente["cobros"],
  };
}

/** Correo del usuario de acceso de una empresa (lectura directa de auth.users no está expuesta; se guarda en ws_mi_empresa). */
export async function correoDeUsuario(usuarioId: string | null): Promise<string | null> {
  if (!usuarioId) return null;
  const { db } = await conSesion();
  const { data } = await db.rpc("ws_correo_usuario", { p_usuario: usuarioId });
  return (data as string | null) ?? null;
}

/** Lista corta para selects: id y nombre (el colaborador ve solo sus empresas). */
export const opcionesClientes = cache(async function opcionesClientes(): Promise<{ id: string; nombre: string }[]> {
  const { db } = await conSesionPanel();
  const { data, error } = await db.from("clientes").select("id, nombre").order("nombre").limit(500);
  if (error) throw error;
  return (data ?? []) as { id: string; nombre: string }[];
});
