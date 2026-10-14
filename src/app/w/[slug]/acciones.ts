"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/insforge/server";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import type { EntidadComentario } from "@/types/database";

const textoSchema = z.string().trim().min(1, "Escribe un comentario.").max(4000);

/** La empresa comenta una entidad suya (vía ws_comentar, que valida pertenencia). */
export async function comentarEmpresa(slug: string, entidad: EntidadComentario, entidadId: string, texto: string): Promise<Resultado<{ id: string }>> {
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el texto.");
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { data, error } = await insforge.database.rpc("ws_comentar", { p_entidad: entidad, p_id: entidadId, p_texto: parsed.data });
  if (error) return fallo(traducirError(error).mensaje);
  if (entidad === "trabajo") revalidatePath(`/w/${slug}/proyectos/${entidadId}`);
  revalidatePath(`/w/${slug}`);
  return exito({ id: data as string });
}
