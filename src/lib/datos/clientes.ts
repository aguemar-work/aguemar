import type { ClienteRow, EquipoRow, FichaRow, CotizacionRow } from "@/types/database";
import { conSesion } from "./base";

export interface ClienteResumen extends ClienteRow {
  equipos: { count: number }[];
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
    consulta = consulta.or(`nombre.ilike.%${q}%,num_doc.ilike.%${q}%,contacto.ilike.%${q}%`);
  }
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as ClienteResumen[];
}

export async function obtenerCliente(id: string): Promise<ClienteRow | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("clientes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ClienteRow | null) ?? null;
}

export interface HistorialCliente {
  equipos: EquipoRow[];
  fichas: FichaRow[];
  cotizaciones: CotizacionRow[];
}

export async function historialCliente(id: string): Promise<HistorialCliente> {
  const { db } = await conSesion();
  const [equipos, fichas, cotizaciones] = await Promise.all([
    db.from("equipos").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
    db.from("fichas").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).limit(50),
    db.from("cotizaciones").select("*").eq("cliente_id", id).order("fecha", { ascending: false }).limit(50),
  ]);
  for (const r of [equipos, fichas, cotizaciones]) {
    if (r.error) throw r.error;
  }
  return {
    equipos: (equipos.data ?? []) as EquipoRow[],
    fichas: (fichas.data ?? []) as FichaRow[],
    cotizaciones: (cotizaciones.data ?? []) as CotizacionRow[],
  };
}

/** Lista corta para selects: id y nombre. */
export async function opcionesClientes(): Promise<{ id: string; nombre: string }[]> {
  const { db } = await conSesion();
  const { data, error } = await db.from("clientes").select("id, nombre").order("nombre").limit(500);
  if (error) throw error;
  return (data ?? []) as { id: string; nombre: string }[];
}
