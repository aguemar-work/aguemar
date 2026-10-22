import type { ComentarioRow, EntidadComentario } from "@/types/database";
import { conSesionPanel } from "./base";

/** Hilo de una entidad, visto por el propietario. */
export async function comentariosDe(entidad: EntidadComentario, entidadId: string): Promise<ComentarioRow[]> {
  const { db } = await conSesionPanel();
  const { data, error } = await db
    .from("comentarios")
    .select("*")
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ComentarioRow[];
}

export interface ComentarioBandeja extends ComentarioRow {
  clientes: { id: string; nombre: string; slug: string | null } | null;
}

/** Comentarios de empresas (no del propietario), los no leídos primero. */
export async function bandejaComentarios(soloNoLeidos = false): Promise<ComentarioBandeja[]> {
  const { db } = await conSesionPanel();
  let consulta = db
    .from("comentarios")
    .select("*, clientes(id, nombre, slug)")
    .eq("es_propietario", false)
    .order("leido", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);
  if (soloNoLeidos) consulta = consulta.eq("leido", false);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as ComentarioBandeja[];
}

export async function contarNoLeidos(): Promise<number> {
  const { db } = await conSesionPanel();
  const { count, error } = await db.from("comentarios").select("id", { count: "exact", head: true }).eq("es_propietario", false).eq("leido", false);
  if (error) throw error;
  return count ?? 0;
}

/** Título de la entidad comentada, para la bandeja. */
export async function titulosDeTrabajos(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { db } = await conSesionPanel();
  const { data, error } = await db.from("trabajos").select("id, titulo").in("id", ids);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as { id: string; titulo: string }[]).map((t) => [t.id, t.titulo]));
}

/** Número y asunto de las cotizaciones comentadas, para la bandeja (solo las ve el propietario). */
export async function titulosDeCotizaciones(ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const { db } = await conSesionPanel();
  const { data, error } = await db.from("cotizaciones").select("id, numero, asunto").in("id", ids);
  if (error) throw error;
  return Object.fromEntries(((data ?? []) as { id: string; numero: string | null; asunto: string }[]).map((c) => [c.id, `${c.numero ?? "Cotización"} · ${c.asunto}`]));
}
