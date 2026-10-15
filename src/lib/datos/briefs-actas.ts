import { cache } from "react";
import type { ActaJson, BriefJson, EntregableActa } from "@/lib/documentos";
import type { Area } from "@/types/database";
import { conSesion } from "./base";

/** Fila editable de un brief (incluye notas internas). */
export interface BriefFila {
  id: string;
  numero: string | null;
  cliente_id: string;
  trabajo_id: string | null;
  area: Area;
  fecha: string;
  titulo: string;
  objetivo: string | null;
  contexto: string | null;
  publico: string | null;
  alcance: string | null;
  fuera_alcance: string | null;
  entregables: string | null;
  referencias: string | null;
  fecha_entrega: string | null;
  notas: string | null;
  publicado: boolean;
}

export interface ActaFila {
  id: string;
  numero: string | null;
  cliente_id: string;
  trabajo_id: string | null;
  area: Area;
  fecha: string;
  titulo: string;
  resumen: string | null;
  entregables: EntregableActa[];
  observaciones: string | null;
  notas: string | null;
  publicada: boolean;
  aceptada_en: string | null;
}

export const obtenerBriefFila = cache(async function obtenerBriefFila(id: string): Promise<BriefFila | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("briefs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as BriefFila | null) ?? null;
});

export const obtenerActaFila = cache(async function obtenerActaFila(id: string): Promise<ActaFila | null> {
  const { db } = await conSesion();
  const { data, error } = await db.from("actas_entrega").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as ActaFila | null) ?? null;
});

/** Documento completo (misma forma que el workspace y el portal). */
export const obtenerBrief = cache(async function obtenerBrief(id: string): Promise<BriefJson | null> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("brief_panel", { p_id: id });
  if (error) throw error;
  return (data as BriefJson | null) ?? null;
});

export const obtenerActa = cache(async function obtenerActa(id: string): Promise<ActaJson | null> {
  const { db } = await conSesion();
  const { data, error } = await db.rpc("acta_panel", { p_id: id });
  if (error) throw error;
  return (data as ActaJson | null) ?? null;
});

/** Contexto que no va en el documento: empresa (mensajes y workspace), trabajo y notas internas. */
export async function contextoDocumento(tabla: "briefs" | "actas_entrega", id: string) {
  const { db } = await conSesion();
  const tipo = tabla === "briefs" ? "brief" : "acta";
  const [doc, enlace] = await Promise.all([
    db
      .from(tabla)
      .select("id, cliente_id, trabajo_id, notas, clientes(id, nombre, contacto, telefono, slug, usuario_id, modulos), trabajos(id, titulo)")
      .eq("id", id)
      .maybeSingle(),
    db.from("enlaces_publicos").select("token, revocado, vistas, ultima_vista").eq("tipo", tipo).eq("documento_id", id).maybeSingle(),
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

export interface DocumentoListado {
  id: string;
  tipo: "ficha" | "brief" | "acta";
  numero: string | null;
  fecha: string;
  titulo: string;
  empresa: string | null;
  publicado: boolean;
  estado: string | null;
}

/** Todos los documentos del propietario (fichas, briefs y actas) para el listado general. */
export async function listarDocumentos(filtros: { tipo?: string; q?: string; cliente?: string } = {}): Promise<DocumentoListado[]> {
  const { db } = await conSesion();
  const q = filtros.q?.replace(/[%,()]/g, " ").trim();
  const quiero = (t: string) => !filtros.tipo || filtros.tipo === t;
  const filtrar = <T extends { eq: (c: string, v: string) => T; or: (f: string) => T }>(consulta: T, campoTitulo: string) => {
    let c = consulta;
    if (filtros.cliente) c = c.eq("cliente_id", filtros.cliente);
    if (q) c = c.or(`${campoTitulo}.ilike.%${q}%,numero.ilike.%${q}%`);
    return c;
  };
  const [fichas, briefs, actas] = await Promise.all([
    quiero("ficha") ? filtrar(db.from("fichas").select("id, numero, fecha, titular, publicada, estado_final, clientes(nombre)").order("fecha", { ascending: false }).limit(200), "titular") : null,
    quiero("brief") ? filtrar(db.from("briefs").select("id, numero, fecha, titulo, publicado, clientes(nombre)").order("fecha", { ascending: false }).limit(200), "titulo") : null,
    quiero("acta") ? filtrar(db.from("actas_entrega").select("id, numero, fecha, titulo, publicada, aceptada_en, clientes(nombre)").order("fecha", { ascending: false }).limit(200), "titulo") : null,
  ]);
  for (const r of [fichas, briefs, actas]) if (r?.error) throw r.error;
  type F = { id: string; numero: string | null; fecha: string; titular: string; publicada: boolean; estado_final: string; clientes: { nombre: string } | null };
  type B = { id: string; numero: string | null; fecha: string; titulo: string; publicado: boolean; clientes: { nombre: string } | null };
  type A = { id: string; numero: string | null; fecha: string; titulo: string; publicada: boolean; aceptada_en: string | null; clientes: { nombre: string } | null };
  const todos: DocumentoListado[] = [
    ...((fichas?.data ?? []) as unknown as F[]).map((f) => ({ id: f.id, tipo: "ficha" as const, numero: f.numero, fecha: f.fecha, titulo: f.titular, empresa: f.clientes?.nombre ?? null, publicado: f.publicada, estado: f.estado_final })),
    ...((briefs?.data ?? []) as unknown as B[]).map((b) => ({ id: b.id, tipo: "brief" as const, numero: b.numero, fecha: b.fecha, titulo: b.titulo, empresa: b.clientes?.nombre ?? null, publicado: b.publicado, estado: null })),
    ...((actas?.data ?? []) as unknown as A[]).map((a) => ({
      id: a.id,
      tipo: "acta" as const,
      numero: a.numero,
      fecha: a.fecha,
      titulo: a.titulo,
      empresa: a.clientes?.nombre ?? null,
      publicado: a.publicada,
      estado: a.aceptada_en ? "aceptada" : a.publicada ? "por_aceptar" : null,
    })),
  ];
  return todos.sort((x, y) => y.fecha.localeCompare(x.fecha) || (y.numero ?? "").localeCompare(x.numero ?? ""));
}

/** Entregables de un trabajo, para precargar el acta. */
export async function entregablesDeTrabajo(trabajoId: string): Promise<EntregableActa[]> {
  const { db } = await conSesion();
  const { data, error } = await db.from("trabajo_entregables").select("nombre, nota, url").eq("trabajo_id", trabajoId).order("orden");
  if (error) throw error;
  return ((data ?? []) as { nombre: string; nota: string | null; url: string | null }[]).map((e) => ({ nombre: e.nombre, detalle: e.nota, url: e.url }));
}

/** Datos de un trabajo para precargar brief o acta. */
export async function datosTrabajo(trabajoId: string): Promise<{ id: string; titulo: string; area: Area; cliente_id: string | null; descripcion: string | null } | null> {
  const { db } = await conSesion();
  const { data } = await db.from("trabajos").select("id, titulo, area, cliente_id, descripcion").eq("id", trabajoId).maybeSingle();
  return (data as { id: string; titulo: string; area: Area; cliente_id: string | null; descripcion: string | null } | null) ?? null;
}
