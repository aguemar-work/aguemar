"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { plantillaSchema, type PlantillaInput } from "@/lib/validators/plantilla";

export async function guardarPlantilla(input: PlantillaInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = plantillaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los pasos.", issue?.path.join("."));
  }
  return accion("plantillas.guardarPlantilla", async () => {
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
  });
}

export async function eliminarPlantilla(id: string): Promise<Resultado<void>> {
  return accion("plantillas.eliminarPlantilla", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("plantillas_checklist").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/panel/plantillas");
    return exito(undefined);
  });
}
