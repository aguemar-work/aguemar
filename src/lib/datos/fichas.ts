import { cache } from "react";
import type { EquipoRow, FichaDiagnosticoRow, FichaIncidenciaRow, FichaRecomendacionRow, FichaRow, FichaTrabajoRow, TipoDocumento } from "@/types/database";
import type { FichaJson } from "@/lib/documentos";
import { conSesion } from "./base";

export type FichaResumen = FichaRow & {
  clientes: { id: string; nombre: string } | null;
  equipos: { id: string; marca: string | null; modelo: string | null; serie: string } | null;
};

export async function listarFichas(filtros: { cliente?: string; q?: string; publicadas?: boolean } = {}): Promise<FichaResumen[]> {
  const { db } = await conSesion();
  let consulta = db
    .from("fichas")
    .select("*, clientes(id, nombre), equipos(id, marca, modelo, serie)")
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .limit(200);
  if (filtros.cliente) consulta = consulta.eq("cliente_id", filtros.cliente);
  if (filtros.publicadas !== undefined) consulta = consulta.eq("publicada", filtros.publicadas);
  const q = filtros.q?.replace(/[%,()]/g, " ").trim();
  if (q) consulta = consulta.or(`titular.ilike.%${q}%,numero.ilike.%${q}%,tipo_servicio.ilike.%${q}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as FichaResumen[];
}

export type FichaEdicion = FichaRow & {
  equipos: EquipoRow | null;
  ficha_diagnosticos: FichaDiagnosticoRow[];
  ficha_trabajos: FichaTrabajoRow[];
  ficha_incidencias: FichaIncidenciaRow[];
  ficha_recomendaciones: FichaRecomendacionRow[];
};

/** Ficha con sus filas, para editar. */
export const obtenerFichaEdicion = cache(async function obtenerFichaEdicion(id: string): Promise<FichaEdicion | null> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("fichas")
    .select("*, equipos(*), ficha_diagnosticos(*), ficha_trabajos(*), ficha_incidencias(*), ficha_recomendaciones(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const f = data as FichaEdicion;
  const porOrden = <T extends { orden: number }>(xs: T[] | null) => [...(xs ?? [])].sort((a, b) => a.orden - b.orden);
  f.ficha_diagnosticos = porOrden(f.ficha_diagnosticos);
  f.ficha_trabajos = porOrden(f.ficha_trabajos);
  f.ficha_incidencias = porOrden(f.ficha_incidencias);
  f.ficha_recomendaciones = porOrden(f.ficha_recomendaciones);
  return f;
});

/** Ficha completa en la forma de los documentos (una sola llamada: ficha_panel). */
export const obtenerFicha = cache(async function obtenerFicha(id: string): Promise<FichaJson | null> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("ficha_panel", { p_id: id });
  if (error) throw error;
  return (data as FichaJson | null) ?? null;
});

/** Datos de la ficha que no van en el documento: empresa (para WhatsApp y workspace), trabajo vinculado, vistas del enlace. */
export async function contextoFicha(id: string) {
  const { db } = await conSesion();
  const [ficha, enlace] = await Promise.all([
    db
      .from("fichas")
      .select("id, cliente_id, equipo_id, trabajo_id, clientes(id, nombre, contacto, telefono, slug, usuario_id, modulos), trabajos(id, titulo)")
      .eq("id", id)
      .maybeSingle(),
    db.from("enlaces_publicos").select("token, revocado, vistas, ultima_vista").eq("tipo", "ficha").eq("documento_id", id).maybeSingle(),
  ]);
  if (ficha.error) throw ficha.error;
  return {
    ficha: ficha.data as {
      id: string;
      cliente_id: string;
      equipo_id: string | null;
      trabajo_id: string | null;
      clientes: { id: string; nombre: string; contacto: string | null; telefono: string | null; slug: string | null; usuario_id: string | null; modulos: string[] } | null;
      trabajos: { id: string; titulo: string } | null;
    } | null,
    enlace: enlace.data as { token: string; revocado: boolean; vistas: number; ultima_vista: string | null } | null,
  };
}

/** Enlace público vigente de un documento (o null). */
export async function enlaceDe(tipo: TipoDocumento, id: string): Promise<{ token: string; revocado: boolean; vistas: number } | null> {
  const { db } = await conSesion();
  const { data } = await db.from("enlaces_publicos").select("token, revocado, vistas").eq("tipo", tipo).eq("documento_id", id).maybeSingle();
  return (data as { token: string; revocado: boolean; vistas: number } | null) ?? null;
}

/** Equipos de todas las empresas, para el selector de la ficha (se filtra por empresa en el cliente). */
export async function opcionesEquipos(): Promise<{ id: string; cliente_id: string; marca: string | null; modelo: string | null; serie: string }[]> {
  const { db } = await conSesion();
  const { data, error } = await db.from("equipos").select("id, cliente_id, marca, modelo, serie").order("marca").limit(1000);
  if (error) throw error;
  return (data ?? []) as { id: string; cliente_id: string; marca: string | null; modelo: string | null; serie: string }[];
}

/** Trabajos para vincular la ficha (activos y recientes). */
export async function opcionesTrabajos(): Promise<{ id: string; cliente_id: string | null; titulo: string }[]> {
  const { db } = await conSesion();
  const { data, error } = await db
    .from("trabajos")
    .select("id, cliente_id, titulo")
    .in("estado", ["propuesta", "en_curso", "en_revision", "entregado"])
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as { id: string; cliente_id: string | null; titulo: string }[];
}
