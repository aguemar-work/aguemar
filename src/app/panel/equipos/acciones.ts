"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { equipoSchema, type EquipoInput } from "@/lib/validators/equipo";

function revalidar(clienteId: string, id?: string) {
  revalidatePath("/panel/equipos");
  revalidatePath(`/panel/clientes/${clienteId}`);
  revalidatePath("/panel");
  if (id) revalidatePath(`/panel/equipos/${id}`);
}

export async function guardarEquipo(input: EquipoInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = equipoSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }

  try {
    const { db, usuario } = await conSesion();
    const datos = parsed.data;

    const consulta = id
      ? db.from("equipos").update(datos).eq("id", id).select("id").single()
      : db
          .from("equipos")
          .insert([{ ...datos, owner_id: usuario.id }])
          .select("id")
          .single();

    const { data, error } = await consulta;
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    const nuevoId = (data as { id: string }).id;
    revalidar(datos.cliente_id, nuevoId);
    return exito({ id: nuevoId });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarEquipo(id: string, clienteId: string): Promise<Resultado<void>> {
  try {
    // Solo el propietario (el colaborador no borra ni reorganiza): mensaje claro en vez de un falso éxito.
    await exigirPropietario();
    const { db } = await conSesion();
    const fichas = await db.from("fichas").select("id", { count: "exact", head: true }).eq("equipo_id", id);
    if ((fichas.count ?? 0) > 0) {
      return fallo("Este equipo tiene fichas técnicas. No se puede eliminar para conservar el historial.");
    }
    const { error } = await db.from("equipos").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(clienteId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
