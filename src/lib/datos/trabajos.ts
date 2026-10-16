import { cache } from "react";
import type { Area, EstadoTrabajo, TrabajoEntregableRow, TrabajoEtapaRow, TrabajoRow, TrabajoTareaRow } from "@/types/database";
import { conSesionPanel } from "./base";
import { filtroOr } from "./busqueda";

export interface TrabajoResumen extends TrabajoRow {
  clientes: { id: string; nombre: string } | null;
  trabajo_tareas: { hecha: boolean }[];
}

export interface FiltrosTrabajos {
  area?: Area;
  estado?: EstadoTrabajo | "activos" | "todos";
  clienteId?: string;
  busqueda?: string;
}

const ACTIVOS: EstadoTrabajo[] = ["propuesta", "en_curso", "en_revision"];

export async function listarTrabajos(filtros: FiltrosTrabajos = {}): Promise<TrabajoResumen[]> {
  const { db } = await conSesionPanel();
  let consulta = db
    .from("trabajos")
    .select("*, clientes(id, nombre), trabajo_tareas(hecha)")
    .order("orden", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  if (filtros.area) consulta = consulta.eq("area", filtros.area);
  if (filtros.clienteId) consulta = consulta.eq("cliente_id", filtros.clienteId);
  if (filtros.estado && filtros.estado !== "todos" && filtros.estado !== "activos") consulta = consulta.eq("estado", filtros.estado);
  if (!filtros.estado || filtros.estado === "activos") consulta = consulta.in("estado", ACTIVOS);
  const q = filtros.busqueda?.trim();
  if (q) consulta = consulta.or(filtroOr(q, ["titulo", "descripcion"]));
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as TrabajoResumen[];
}

export interface TrabajoDetalle extends TrabajoRow {
  clientes: { id: string; nombre: string; contacto: string | null; telefono: string | null } | null;
}

export const obtenerTrabajo = cache(async function obtenerTrabajo(id: string): Promise<TrabajoDetalle | null> {
  const { db } = await conSesionPanel();
  const { data, error } = await db.from("trabajos").select("*, clientes(id, nombre, contacto, telefono)").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as TrabajoDetalle | null) ?? null;
});

export interface PlanTrabajo {
  etapas: TrabajoEtapaRow[];
  tareas: TrabajoTareaRow[];
  entregables: TrabajoEntregableRow[];
}

export const planTrabajo = cache(async function planTrabajo(id: string): Promise<PlanTrabajo> {
  const { db } = await conSesionPanel();
  const [etapas, tareas, entregables] = await Promise.all([
    db.from("trabajo_etapas").select("*").eq("trabajo_id", id).order("orden").order("created_at"),
    db.from("trabajo_tareas").select("*").eq("trabajo_id", id).order("orden").order("created_at"),
    db.from("trabajo_entregables").select("*").eq("trabajo_id", id).order("orden").order("created_at"),
  ]);
  for (const r of [etapas, tareas, entregables]) if (r.error) throw r.error;
  return {
    etapas: (etapas.data ?? []) as TrabajoEtapaRow[],
    tareas: (tareas.data ?? []) as TrabajoTareaRow[],
    entregables: (entregables.data ?? []) as TrabajoEntregableRow[],
  };
});

export async function trabajosDeCliente(clienteId: string): Promise<TrabajoResumen[]> {
  const { db } = await conSesionPanel();
  const { data, error } = await db
    .from("trabajos")
    .select("*, clientes(id, nombre), trabajo_tareas(hecha)")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as TrabajoResumen[];
}
