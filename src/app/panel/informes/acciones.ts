"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conSesion } from "@/lib/datos/base";
import { datosDelPeriodo } from "@/lib/datos/informes";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { armarDesdePeriodo, type IndicadorInforme, type SeccionInforme } from "@/lib/informe";
import { informeSchema, type InformeInput } from "@/lib/validators/informe";
import { avisarDocumentoEmpresa } from "@/lib/correo/avisos";

function revalidar() {
  revalidatePath("/panel", "layout");
  revalidatePath("/w", "layout");
  revalidatePath("/d", "layout");
}

export async function guardarInforme(input: InformeInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = informeSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path.map(String).join("."));
  }
  try {
    const { db, usuario } = await conSesion();
    if (id) {
      const { error } = await db.from("informes").update(parsed.data).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      revalidar();
      return exito({ id });
    }
    const { data, error } = await db
      .from("informes")
      .insert([{ ...parsed.data, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function publicarInforme(id: string, publicar: boolean): Promise<Resultado<{ token: string | null }>> {
  try {
    const { db } = await conSesion();
    const { error } = await db
      .from("informes")
      .update({ publicado: publicar, publicado_en: publicar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    let token: string | null = null;
    if (publicar) {
      const r = await db.rpc("obtener_enlace", { p_tipo: "informe", p_id: id, p_renovar: false });
      if (r.error) return fallo(traducirError(r.error).mensaje);
      token = r.data as string;
      await avisarDocumentoEmpresa("informe", id);
    }
    revalidar();
    return exito({ token });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarInforme(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    await Promise.all([
      db.from("enlaces_publicos").delete().eq("tipo", "informe").eq("documento_id", id),
      db.from("comentarios").delete().eq("entidad", "informe").eq("entidad_id", id),
    ]);
    const { error } = await db.from("informes").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

const periodoSchema = z.object({
  cliente_id: z.string().uuid("Elige la empresa primero."),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige el periodo."),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige el periodo."),
  trabajo_id: z.string().uuid().nullable().optional(),
});

/** Propone resumen, indicadores y secciones con lo hecho en el periodo (no guarda nada). */
export async function armarInforme(input: z.input<typeof periodoSchema>): Promise<Resultado<{ resumen: string; indicadores: IndicadorInforme[]; secciones: SeccionInforme[]; vacio: boolean }>> {
  const parsed = periodoSchema.safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el periodo.");
  if (parsed.data.hasta < parsed.data.desde) return fallo("El fin del periodo no puede ser antes del inicio.");
  try {
    const d = await datosDelPeriodo(parsed.data.cliente_id, parsed.data.desde, parsed.data.hasta, parsed.data.trabajo_id);
    const armado = armarDesdePeriodo(d);
    const vacio = !d.trabajos.length && !d.actividades.length && !d.fichas.length;
    return exito({ ...armado, vacio });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
