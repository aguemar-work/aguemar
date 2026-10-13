import type { EquipoRow, FichaRow } from "@/types/database";
import { conSesion } from "./base";

export interface EquipoConCliente extends EquipoRow {
  clientes: { id: string; nombre: string } | null;
  fichas: { count: number }[];
}

export async function listarEquipos(opciones?: { clienteId?: string; busqueda?: string }): Promise<EquipoConCliente[]> {
  const { db } = await conSesion();
  let consulta = db
    .from("equipos")
    .select("*, clientes(id, nombre), fichas(count)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (opciones?.clienteId) consulta = consulta.eq("cliente_id", opciones.clienteId);
  const q = opciones?.busqueda?.trim();
  if (q) consulta = consulta.or(`serie.ilike.%${q}%,marca.ilike.%${q}%,modelo.ilike.%${q}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as EquipoConCliente[];
}

export async function obtenerEquipo(id: string): Promise<EquipoConCliente | null> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("equipos")
    .select("*, clientes(id, nombre), fichas(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as EquipoConCliente | null) ?? null;
}

export async function fichasDeEquipo(id: string): Promise<FichaRow[]> {
  const { db } = await conSesion();
  const { data, error } = await db.from("fichas").select("*").eq("equipo_id", id).order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FichaRow[];
}
