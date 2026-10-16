import { cache } from "react";
import type { Area, EstadoTrabajo } from "@/types/database";
import type { TipoActividad } from "@/lib/calendario";
import { conSesion } from "./base";

/** Inicio del colaborador (equipo_resumen): solo sus empresas asignadas, sin dinero. */
export interface ResumenEquipo {
  empresas: { id: string; nombre: string; slug: string | null }[];
  trabajos: { id: string; titulo: string; area: Area; estado: EstadoTrabajo; fecha_compromiso: string | null; empresa: string; tareas: number; hechas: number }[];
  tareas_vencidas: { id: string; titulo: string; fecha_limite: string; trabajo_id: string; trabajo: string; empresa: string }[];
  agenda: { id: string; titulo: string; tipo: TipoActividad; fecha: string; hora_inicio: string | null; empresa: string }[];
  comentarios: number;
}

export const resumenEquipo = cache(async function resumenEquipo(): Promise<ResumenEquipo> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("equipo_resumen");
  if (error) throw error;
  const r = (data ?? {}) as Partial<ResumenEquipo>;
  return {
    empresas: r.empresas ?? [],
    trabajos: r.trabajos ?? [],
    tareas_vencidas: r.tareas_vencidas ?? [],
    agenda: r.agenda ?? [],
    comentarios: Number(r.comentarios ?? 0),
  };
});

/** Colaborador del equipo, para la página Equipo del propietario (equipo_listar). */
export interface Colaborador {
  user_id: string;
  nombre: string | null;
  correo: string;
  activo: boolean;
  desde: string;
  empresas: { id: string; nombre: string }[];
}

export interface InvitacionPendiente {
  id: string;
  tipo: "empresa" | "colaborador";
  correo: string;
  nombre: string | null;
  cliente_id: string | null;
  empresas: string[];
  token: string;
  expira_en: string;
  created_at: string;
}

export async function listarEquipo(): Promise<{ colaboradores: Colaborador[]; invitaciones: InvitacionPendiente[] }> {
  const { db } = await conSesion();
  const [equipo, invitaciones] = await Promise.all([
    db.rpc("equipo_listar"),
    db
      .from("invitaciones")
      .select("id, tipo, correo, nombre, cliente_id, empresas, token, expira_en, created_at")
      .eq("tipo", "colaborador")
      .is("usada_en", null)
      .eq("revocada", false)
      .order("created_at", { ascending: false }),
  ]);
  if (equipo.error) throw equipo.error;
  if (invitaciones.error) throw invitaciones.error;
  return { colaboradores: (equipo.data ?? []) as Colaborador[], invitaciones: (invitaciones.data ?? []) as InvitacionPendiente[] };
}

/** Invitación pendiente de una empresa (acceso a su workspace), si la hay. */
export async function invitacionDeEmpresa(clienteId: string): Promise<InvitacionPendiente | null> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("invitaciones")
    .select("id, tipo, correo, nombre, cliente_id, empresas, token, expira_en, created_at")
    .eq("tipo", "empresa")
    .eq("cliente_id", clienteId)
    .is("usada_en", null)
    .eq("revocada", false)
    .maybeSingle();
  if (error) throw error;
  return (data as InvitacionPendiente | null) ?? null;
}
