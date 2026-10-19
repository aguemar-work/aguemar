"use server";

import { revalidatePath } from "next/cache";
import { conSesion } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { precioACentimos, servicioSchema, type ServicioInput } from "@/lib/validators/servicio";

function revalidar() {
  revalidatePath("/panel/servicios");
  revalidatePath("/");
  revalidatePath("/en");
}

export async function guardarServicio(input: ServicioInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = servicioSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const { precio_base_texto, ...resto } = parsed.data;
  const datos = { ...resto, precio_base: precioACentimos(precio_base_texto) };

  try {
    const { db, usuario } = await conSesion();
    if (id) {
      const { data, error } = await db.from("servicios").update(datos).eq("id", id).select("id").single();
      if (error) return fallo(traducirError(error).mensaje);
      revalidar();
      return exito({ id: (data as { id: string }).id });
    }
    const ultimo = await db.from("servicios").select("orden").order("orden", { ascending: false }).limit(1).maybeSingle();
    const orden = ((ultimo.data as { orden: number } | null)?.orden ?? 0) + 1;
    const { data, error } = await db
      .from("servicios")
      .insert([{ ...datos, orden, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function cambiarVisibilidadServicio(id: string, visible: boolean): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("servicios").update({ visible_landing: visible }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Recibe los ids en el orden deseado y los renumera 1..n. */
export async function reordenarServicios(ids: string[]): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const resultados = await Promise.all(ids.map((id, i) => db.from("servicios").update({ orden: i + 1 }).eq("id", id)));
    const conError = resultados.find((r) => r.error);
    if (conError?.error) return fallo(traducirError(conError.error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarServicio(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    // Los ítems de cotización que lo usan quedan con servicio_id = null (on delete set null).
    const { error } = await db.from("servicios").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
