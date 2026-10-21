"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { plantillaSchema, type PlantillaInput } from "@/lib/validators/plantilla";

export async function guardarPlantilla(input: PlantillaInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = plantillaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los pasos.", issue?.path.join("."));
  }
  try {
    await exigirPropietario();
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
    revalidatePath("/panel/plantillas");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarPlantilla(id: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("plantillas_checklist").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/plantillas");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
