"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { marcaSchema, porcentajeABasis, type MarcaInput } from "@/lib/validators/marca";

export async function guardarMarca(input: MarcaInput): Promise<Resultado<{ id: string }>> {
  const parsed = marcaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const { igv_porcentaje, ...resto } = parsed.data;
  const datos = { ...resto, igv_pct: porcentajeABasis(igv_porcentaje) };

  try {
    await exigirPropietario();
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
    revalidatePath("/en");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
