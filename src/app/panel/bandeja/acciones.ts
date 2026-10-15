"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conSesion } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import type { EntidadComentario } from "@/types/database";

const textoSchema = z.string().trim().min(1, "Escribe un comentario.").max(4000);

function rutasDe(entidad: EntidadComentario, entidadId: string) {
  const rutas = ["/panel/bandeja", "/panel"];
  if (entidad === "trabajo") rutas.push(`/panel/trabajos/${entidadId}`);
  if (entidad === "actividad") rutas.push(`/panel/calendario/${entidadId}`, "/panel/calendario");
  return rutas;
}

/** El propietario comenta o responde en una entidad de una empresa. */
export async function comentarPropietario(entidad: EntidadComentario, entidadId: string, clienteId: string, texto: string): Promise<Resultado<{ id: string }>> {
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el texto.");
  try {
    const { db, usuario } = await conSesion();
    const { data, error } = await db
      .from("comentarios")
      .insert([{ owner_id: usuario.id, cliente_id: clienteId, entidad, entidad_id: entidadId, autor_uid: usuario.id, es_propietario: true, texto: parsed.data, leido: true }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    // Al responder, los comentarios de la empresa en ese hilo quedan leídos.
    await db.from("comentarios").update({ leido: true }).eq("entidad", entidad).eq("entidad_id", entidadId).eq("es_propietario", false);
    rutasDe(entidad, entidadId).forEach((r) => revalidatePath(r));
    revalidatePath("/w", "layout");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function marcarComentarioLeido(id: string, leido = true): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("comentarios").update({ leido }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/bandeja");
    revalidatePath("/panel");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarComentario(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("comentarios").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/bandeja");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
