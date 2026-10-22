"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conSesion } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import type { EntidadComentario } from "@/types/database";
import { avisarRespuestaEmpresa } from "@/lib/correo/avisos";

const textoSchema = z.string().trim().min(1, "Escribe un comentario.").max(4000);

function rutasDe(entidad: EntidadComentario, entidadId: string) {
  const rutas = ["/panel/bandeja", "/panel"];
  if (entidad === "trabajo") rutas.push(`/panel/trabajos/${entidadId}`);
  if (entidad === "actividad") rutas.push(`/panel/calendario/${entidadId}`, "/panel/calendario");
  if (entidad === "informe") rutas.push(`/panel/informes/${entidadId}`);
  if (entidad === "cotizacion") rutas.push(`/panel/cotizaciones/${entidadId}`);
  return rutas;
}

/** El propietario comenta o responde en una entidad de una empresa. */
export async function comentarPropietario(entidad: EntidadComentario, entidadId: string, clienteId: string, texto: string): Promise<Resultado<{ id: string }>> {
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el texto.");
  return accion("bandeja.comentarPropietario", async () => {
    const { db, usuario } = await conSesion();
    const { data, error } = await db
      .from("comentarios")
      .insert([{ owner_id: usuario.id, cliente_id: clienteId, entidad, entidad_id: entidadId, autor_uid: usuario.id, es_propietario: true, texto: parsed.data, leido: true }])
      .select("id")
      .single();
    if (error) throw error;
    // Al responder, los comentarios de la empresa en ese hilo quedan leídos.
    await db.from("comentarios").update({ leido: true }).eq("entidad", entidad).eq("entidad_id", entidadId).eq("es_propietario", false);
    rutasDe(entidad, entidadId).forEach((r) => revalidatePath(r));
    revalidatePath("/w", "layout");
    await avisarRespuestaEmpresa(entidad, entidadId, clienteId, parsed.data);
    return exito({ id: (data as { id: string }).id });
  });
}

export async function marcarComentarioLeido(id: string, leido = true): Promise<Resultado<void>> {
  return accion("bandeja.marcarComentarioLeido", async () => {
    const { db } = await conSesion();
    const { error } = await db.from("comentarios").update({ leido }).eq("id", id);
    if (error) throw error;
    revalidatePath("/panel/bandeja");
    revalidatePath("/panel");
    return exito(undefined);
  });
}
