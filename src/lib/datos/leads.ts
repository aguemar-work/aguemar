import type { EstadoLead, LeadRow } from "@/types/database";
import { conSesion } from "./base";

export type LeadFila = Pick<LeadRow, "id" | "nombre" | "telefono" | "correo" | "servicio" | "mensaje" | "estado" | "cliente_id" | "created_at"> & {
  clientes: { id: string; nombre: string } | null;
};

/** Mensajes del formulario de la landing, los más nuevos primero. */
export async function listarLeads(estado?: EstadoLead): Promise<{ leads: LeadFila[]; conteo: Record<EstadoLead, number> }> {
  const { db } = await conSesion();
  let consulta = db
    .from("leads")
    .select("id, nombre, telefono, correo, servicio, mensaje, estado, cliente_id, created_at, clientes(id, nombre)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (estado) consulta = consulta.eq("estado", estado);
  const [lista, todos] = await Promise.all([consulta, db.from("leads").select("estado").limit(5000)]);
  if (lista.error) throw lista.error;
  const conteo: Record<EstadoLead, number> = { nuevo: 0, contactado: 0, convertido: 0 };
  for (const l of (todos.data ?? []) as { estado: EstadoLead }[]) conteo[l.estado] += 1;
  return { leads: (lista.data ?? []) as unknown as LeadFila[], conteo };
}
