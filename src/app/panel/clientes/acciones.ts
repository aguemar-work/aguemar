"use server";

import { revalidatePath } from "next/cache";
import { conSesion } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { clienteSchema, type ClienteInput } from "@/lib/validators/cliente";

export async function guardarCliente(input: ClienteInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }

  try {
    const { db, usuario } = await conSesion();
    const datos = parsed.data;

    if (id) {
      const { data, error } = await db.from("clientes").update(datos).eq("id", id).select("id").single();
      if (error) {
        const t = traducirError(error);
        return fallo(t.mensaje, t.campo);
      }
      revalidatePath("/panel/clientes");
      revalidatePath(`/panel/clientes/${id}`);
      return exito({ id: (data as { id: string }).id });
    }

    const { data, error } = await db
      .from("clientes")
      .insert([{ ...datos, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    revalidatePath("/panel/clientes");
    revalidatePath("/panel");
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarCliente(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const [cot, fichas] = await Promise.all([
      db.from("cotizaciones").select("id", { count: "exact", head: true }).eq("cliente_id", id),
      db.from("fichas").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    ]);
    if ((cot.count ?? 0) > 0 || (fichas.count ?? 0) > 0) {
      return fallo("Este cliente tiene cotizaciones o fichas. No se puede eliminar; puedes editarlo o dejarlo como está.");
    }
    const { error } = await db.from("clientes").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/clientes");
    revalidatePath("/panel/equipos");
    revalidatePath("/panel");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
