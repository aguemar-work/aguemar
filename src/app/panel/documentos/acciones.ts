"use server";

import { revalidatePath } from "next/cache";
import { conSesion } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { actaSchema, briefSchema, type ActaInput, type BriefInput } from "@/lib/validators/brief-acta";
import { aceptacionSchema } from "@/lib/validators/cotizacion";

function revalidar() {
  revalidatePath("/panel", "layout");
  revalidatePath("/w", "layout");
  revalidatePath("/d", "layout");
}

function primerError(issues: { message: string; path: PropertyKey[] }[]) {
  const issue = issues[0];
  return fallo<never>(issue?.message ?? "Revisa los datos.", issue?.path.map(String).join("."));
}

async function guardar(tabla: "briefs" | "actas_entrega", datos: Record<string, unknown>, id?: string): Promise<Resultado<{ id: string }>> {
  try {
    const { db, usuario } = await conSesion();
    if (id) {
      const { error } = await db.from(tabla).update(datos).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      revalidar();
      return exito({ id });
    }
    const { data, error } = await db
      .from(tabla)
      .insert([{ ...datos, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Brief
// ---------------------------------------------------------------------------
export async function guardarBrief(input: BriefInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = briefSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  return guardar("briefs", parsed.data, id);
}

export async function publicarBrief(id: string, publicar: boolean): Promise<Resultado<{ token: string | null }>> {
  return publicar_("briefs", "brief", "publicado", id, publicar);
}

export async function eliminarBrief(id: string): Promise<Resultado<void>> {
  return eliminar_("briefs", "brief", id);
}

// ---------------------------------------------------------------------------
// Acta de entrega
// ---------------------------------------------------------------------------
export async function guardarActa(input: ActaInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = actaSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  if (id) {
    const { db } = await conSesion();
    const actual = await db.from("actas_entrega").select("aceptada_en").eq("id", id).maybeSingle();
    if ((actual.data as { aceptada_en: string | null } | null)?.aceptada_en) return fallo("Un acta aceptada no se edita: es el registro de la conformidad.");
  }
  return guardar("actas_entrega", parsed.data, id);
}

export async function publicarActa(id: string, publicar: boolean): Promise<Resultado<{ token: string | null }>> {
  return publicar_("actas_entrega", "acta", "publicada", id, publicar);
}

export async function eliminarActa(id: string): Promise<Resultado<void>> {
  return eliminar_("actas_entrega", "acta", id);
}

/** Registrar la conformidad desde el panel (p. ej. firmada en papel). El DNI es opcional. */
export async function aceptarActa(id: string, input: { nombre: string; dni?: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  try {
    const { db } = await conSesion();
    const { error } = await db.rpc("acta_aceptar_panel", { p_id: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni || null });
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Comunes
// ---------------------------------------------------------------------------
async function publicar_(tabla: "briefs" | "actas_entrega", tipo: "brief" | "acta", campo: "publicado" | "publicada", id: string, publicar: boolean): Promise<Resultado<{ token: string | null }>> {
  try {
    const { db } = await conSesion();
    const { error } = await db
      .from(tabla)
      .update({ [campo]: publicar, [`${campo}_en`]: publicar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    let token: string | null = null;
    if (publicar) {
      const r = await db.rpc("obtener_enlace", { p_tipo: tipo, p_id: id, p_renovar: false });
      if (r.error) return fallo(traducirError(r.error).mensaje);
      token = r.data as string;
    }
    revalidar();
    return exito({ token });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

async function eliminar_(tabla: "briefs" | "actas_entrega", tipo: "brief" | "acta", id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    await db.from("enlaces_publicos").delete().eq("tipo", tipo).eq("documento_id", id);
    const { error } = await db.from(tabla).delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
