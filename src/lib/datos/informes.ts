import { cache } from "react";
import type { InformeJson } from "@/lib/documentos";
import type { DatosPeriodo, IndicadorInforme, SeccionInforme } from "@/lib/informe";
import type { Area } from "@/types/database";
import { conSesion, conSesionPanel } from "./base";
import { filtroOr } from "./busqueda";

/** Fila editable de un informe (incluye notas internas). */
export interface InformeFila {
  id: string;
  numero: string | null;
  cliente_id: string;
  trabajo_id: string | null;
  area: Area;
  fecha: string;
  titulo: string;
  periodo_inicio: string;
  periodo_fin: string;
  resumen: string | null;
  indicadores: IndicadorInforme[];
  secciones: SeccionInforme[];
  notas: string | null;
  publicado: boolean;
}

export interface InformeListado {
  id: string;
  numero: string | null;
  fecha: string;
  titulo: string;
  periodo_inicio: string;
  periodo_fin: string;
  publicado: boolean;
  area: Area;
  cliente_id: string;
  empresa: string | null;
}

export const obtenerInformeFila = cache(async function obtenerInformeFila(id: string): Promise<InformeFila | null> {
  const { db } = await conSesionPanel();
  const { data, error } = await db.from("informes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as InformeFila | null) ?? null;
});

/** Documento completo (misma forma que el workspace, el portal y el PDF). */
export const obtenerInforme = cache(async function obtenerInforme(id: string): Promise<InformeJson | null> {
  const { db } = await conSesionPanel();
  const { data, error } = await db.rpc("informe_panel", { p_id: id });
  if (error) throw error;
  return (data as InformeJson | null) ?? null;
});

/** Lo que no va en el documento: empresa (mensajes y workspace), trabajo, notas y enlace. */
export async function contextoInforme(id: string) {
  const { db } = await conSesionPanel();
  const [doc, enlace] = await Promise.all([
    db
      .from("informes")
      .select("id, cliente_id, trabajo_id, notas, clientes(id, nombre, contacto, telefono, slug, usuario_id, modulos), trabajos(id, titulo)")
      .eq("id", id)
      .maybeSingle(),
    db.from("enlaces_publicos").select("token, revocado, vistas, ultima_vista").eq("tipo", "informe").eq("documento_id", id).maybeSingle(),
  ]);
  if (doc.error) throw doc.error;
  return {
    doc: doc.data as {
      id: string;
      cliente_id: string;
      trabajo_id: string | null;
      notas: string | null;
      clientes: { id: string; nombre: string; contacto: string | null; telefono: string | null; slug: string | null; usuario_id: string | null; modulos: string[] } | null;
      trabajos: { id: string; titulo: string } | null;
    } | null,
    enlace: enlace.data as { token: string; revocado: boolean; vistas: number; ultima_vista: string | null } | null,
  };
}

export async function listarInformes(filtros: { q?: string; cliente?: string; estado?: string } = {}): Promise<InformeListado[]> {
  const { db } = await conSesionPanel();
  let consulta = db
    .from("informes")
    .select("id, numero, fecha, titulo, periodo_inicio, periodo_fin, publicado, area, cliente_id, clientes(nombre)")
    .order("periodo_fin", { ascending: false })
    .order("numero", { ascending: false })
    .limit(200);
  if (filtros.cliente) consulta = consulta.eq("cliente_id", filtros.cliente);
  if (filtros.estado === "publicado") consulta = consulta.eq("publicado", true);
  if (filtros.estado === "borrador") consulta = consulta.eq("publicado", false);
  const q = filtros.q?.replace(/[%,()]/g, " ").trim();
  if (q) consulta = consulta.or(filtroOr(q, ["titulo", "numero"]));
  const { data, error } = await consulta;
  if (error) throw error;
  type Fila = Omit<InformeListado, "empresa"> & { clientes: { nombre: string } | null };
  return ((data ?? []) as unknown as Fila[]).map(({ clientes, ...i }) => ({ ...i, empresa: clientes?.nombre ?? null }));
}

/** Informes de una empresa (ficha de la empresa y detalle del trabajo). */
export async function informesDe(filtro: { cliente?: string; trabajo?: string }): Promise<Pick<InformeListado, "id" | "numero" | "titulo" | "periodo_inicio" | "periodo_fin" | "publicado">[]> {
  const { db } = await conSesionPanel();
  let consulta = db.from("informes").select("id, numero, titulo, periodo_inicio, periodo_fin, publicado").order("periodo_fin", { ascending: false }).limit(20);
  if (filtro.cliente) consulta = consulta.eq("cliente_id", filtro.cliente);
  if (filtro.trabajo) consulta = consulta.eq("trabajo_id", filtro.trabajo);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as Pick<InformeListado, "id" | "numero" | "titulo" | "periodo_inicio" | "periodo_fin" | "publicado">[];
}

/** Lo hecho para una empresa (o un trabajo) en el periodo: base para armar el informe. */
export async function datosDelPeriodo(clienteId: string, desde: string, hasta: string, trabajoId?: string | null): Promise<DatosPeriodo> {
  // Se llama desde una Server Action y es una RPC: no necesita el rol (panel_informe_periodo ya mira tabla y vista).
  const { db } = await conSesion();
  const { data, error } = await db.rpc("panel_informe_periodo", { p_cliente: clienteId, p_desde: desde, p_hasta: hasta, p_trabajo: trabajoId || null });
  if (error) throw error;
  return data as DatosPeriodo;
}
