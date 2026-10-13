"use server";

import { revalidatePath } from "next/cache";
import { conSesion } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { marcaSchema, porcentajeABasis, type MarcaInput } from "@/lib/validators/marca";
import { plantillaSchema, type PlantillaInput } from "@/lib/validators/plantilla";

export async function guardarMarca(input: MarcaInput): Promise<Resultado<{ id: string }>> {
  const parsed = marcaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const { igv_porcentaje, ...resto } = parsed.data;
  const datos = { ...resto, igv_pct: porcentajeABasis(igv_porcentaje) };

  try {
    const { db, usuario } = await conSesion();
    const existente = await db.from("perfil_marca").select("id").maybeSingle();
    if (existente.error) return fallo(traducirError(existente.error).mensaje);

    const id = (existente.data as { id: string } | null)?.id;
    const consulta = id
      ? db.from("perfil_marca").update(datos).eq("id", id).select("id").single()
      : db
          .from("perfil_marca")
          .insert([{ ...datos, owner_id: usuario.id }])
          .select("id")
          .single();
    const { data, error } = await consulta;
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    revalidatePath("/panel/configuracion");
    revalidatePath("/");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function guardarPlantilla(input: PlantillaInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = plantillaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los pasos.", issue?.path.join("."));
  }
  try {
    const { db, usuario } = await conSesion();
    const consulta = id
      ? db.from("plantillas_checklist").update(parsed.data).eq("id", id).select("id").single()
      : db
          .from("plantillas_checklist")
          .insert([{ ...parsed.data, owner_id: usuario.id }])
          .select("id")
          .single();
    const { data, error } = await consulta;
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    revalidatePath("/panel/configuracion");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarPlantilla(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("plantillas_checklist").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/configuracion");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
