"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import type { EstadoLead } from "@/types/database";
import { guardarCliente } from "../clientes/acciones";

function revalidar() {
  revalidatePath("/panel/leads");
  revalidatePath("/panel");
}

export async function cambiarEstadoLead(id: string, estado: EstadoLead): Promise<Resultado<void>> {
  if (!["nuevo", "contactado", "convertido"].includes(estado)) return fallo("Estado no válido.");
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("leads").update({ estado }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarLead(id: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("leads").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/**
 * Crea la empresa con los datos del lead (nombre, contacto, teléfono y correo) y lo marca convertido.
 * Si el mensaje trae "Empresa: …", ese es el nombre de la empresa y el lead queda como contacto.
 */
export async function convertirLeadEnEmpresa(id: string): Promise<Resultado<{ clienteId: string }>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.from("leads").select("nombre, telefono, correo, servicio, mensaje, cliente_id").eq("id", id).maybeSingle();
    if (error) return fallo(traducirError(error).mensaje);
    const lead = data as { nombre: string; telefono: string | null; correo: string | null; servicio: string | null; mensaje: string | null; cliente_id: string | null } | null;
    if (!lead) return fallo("No encontramos ese mensaje.");
    if (lead.cliente_id) return exito({ clienteId: lead.cliente_id });

    const empresa = /^Empresa:\s*(.+)$/m.exec(lead.mensaje ?? "")?.[1]?.trim();
    const notas = [lead.servicio ? `Interés: ${lead.servicio}` : null, lead.mensaje ? `Mensaje desde la web:\n${lead.mensaje}` : null].filter(Boolean).join("\n\n");
    const r = await guardarCliente({
      nombre: empresa || lead.nombre,
      tipo_doc: "RUC",
      num_doc: "",
      contacto: empresa ? lead.nombre : "",
      telefono: lead.telefono ?? "",
      correo: lead.correo ?? "",
      direccion: "",
      notas: notas.slice(0, 2000),
    });
    if (!r.ok) return fallo(r.error);

    const { error: e2 } = await db.from("leads").update({ estado: "convertido", cliente_id: r.data.id }).eq("id", id);
    if (e2) return fallo(traducirError(e2).mensaje);
    revalidar();
    return exito({ clienteId: r.data.id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
