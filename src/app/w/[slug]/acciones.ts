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

const aceptacionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
  dni: z.string().trim().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
});

/** La empresa acepta una cotización suya (ws_aceptar_cotizacion valida pertenencia y vigencia, y crea el trabajo). */
export async function aceptarCotizacionEmpresa(slug: string, id: string, input: { nombre: string; dni: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { error } = await insforge.database.rpc("ws_aceptar_cotizacion", { p_id: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni });
  if (error) return fallo(traducirError(error).mensaje);
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath("/panel", "layout");
  return exito(undefined);
}
