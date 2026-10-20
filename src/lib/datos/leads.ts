import type { EstadoLead, LeadRow } from "@/types/database";
import { hoyLima, sumarDias } from "@/lib/format";
import type { Origen } from "@/lib/origen";
import { conSesion } from "./base";

export type LeadFila = Pick<LeadRow, "id" | "nombre" | "telefono" | "correo" | "servicio" | "mensaje" | "estado" | "cliente_id" | "created_at" | "origen" | "referente" | "utm"> & {
  clientes: { id: string; nombre: string } | null;
};

export type EventoLanding = "whatsapp_click" | "correo_click" | "contacto_enviado";

/** Contactos desde la landing en los últimos días: por evento y por origen (HU 1.1). */
export interface ResumenEventos {
  dias: number;
  porEvento: Record<EventoLanding, number>;
  porOrigen: { origen: Origen; total: number }[];
}

/** Mensajes del formulario de la landing, los más nuevos primero. */
export async function listarLeads(estado?: EstadoLead): Promise<{ leads: LeadFila[]; conteo: Record<EstadoLead, number> }> {
  const { db } = await conSesion();
  let consulta = db
    .from("leads")
    .select("id, nombre, telefono, correo, servicio, mensaje, estado, cliente_id, created_at, origen, referente, utm, clientes(id, nombre)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (estado) consulta = consulta.eq("estado", estado);
  const [lista, todos] = await Promise.all([consulta, db.from("leads").select("estado").limit(5000)]);
  if (lista.error) throw lista.error;
  const conteo: Record<EstadoLead, number> = { nuevo: 0, contactado: 0, convertido: 0 };
  for (const l of (todos.data ?? []) as { estado: EstadoLead }[]) conteo[l.estado] += 1;
  return { leads: (lista.data ?? []) as unknown as LeadFila[], conteo };
}

/** Suma los contadores diarios de eventos_landing de los últimos `dias` (incluye hoy). */
export async function resumenEventos(dias = 30): Promise<ResumenEventos> {
  const { db } = await conSesion();
  const desde = sumarDias(hoyLima(), -(dias - 1));
  const { data, error } = await db.from("eventos_landing").select("evento, origen, total").gte("dia", desde).limit(5000);
  if (error) throw error;
  const porEvento: Record<EventoLanding, number> = { whatsapp_click: 0, correo_click: 0, contacto_enviado: 0 };
  const origenes = new Map<Origen, number>();
  for (const f of (data ?? []) as { evento: EventoLanding; origen: Origen; total: number }[]) {
    porEvento[f.evento] = (porEvento[f.evento] ?? 0) + f.total;
    origenes.set(f.origen, (origenes.get(f.origen) ?? 0) + f.total);
  }
  const porOrigen = [...origenes].map(([origen, total]) => ({ origen, total })).sort((a, b) => b.total - a.total);
  return { dias, porEvento, porOrigen };
}
