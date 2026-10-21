"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conSesion } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { actividadSchema, type ActividadInput } from "@/lib/validators/actividad";
import { hoyLima } from "@/lib/format";
import type { Area } from "@/types/database";
import { avisarSolicitudRespondida } from "@/lib/correo/avisos";

function revalidar() {
  revalidatePath("/panel", "layout");
  revalidatePath("/w", "layout");
}

// ---------------------------------------------------------------------------
// Actividades
// ---------------------------------------------------------------------------
export async function guardarActividad(input: ActividadInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = actividadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path.map(String).join("."));
  }
  // Sin empresa no hay a quién mostrarla.
  const datos = { ...parsed.data, visible_empresa: parsed.data.cliente_id ? parsed.data.visible_empresa : false };
  return accion("calendario.guardarActividad", async () => {
    const { db, usuario } = await conSesion();
    if (id) {
      const { error } = await db.from("actividades").update(datos).eq("id", id);
      if (error) throw error;
      revalidar();
      return exito({ id });
    }
    const { data, error } = await db
      .from("actividades")
      .insert([{ ...datos, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) throw error;
    revalidar();
    return exito({ id: (data as { id: string }).id });
  });
}

export async function cambiarEstadoActividad(id: string, estado: "planificada" | "hecha" | "cancelada"): Promise<Resultado<void>> {
  if (!z.enum(["planificada", "hecha", "cancelada"]).safeParse(estado).success) return fallo("Estado inválido.");
  return accion("calendario.cambiarEstadoActividad", async () => {
    const { db } = await conSesion();
    const { error } = await db.from("actividades").update({ estado }).eq("id", id);
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}

export async function eliminarActividad(id: string): Promise<Resultado<void>> {
  return accion("calendario.eliminarActividad", async () => {
    const { db } = await conSesion();
    await db.from("comentarios").delete().eq("entidad", "actividad").eq("entidad_id", id);
    const { error } = await db.from("actividades").delete().eq("id", id);
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}

// ---------------------------------------------------------------------------
// Solicitudes de las empresas
// ---------------------------------------------------------------------------
const respuestaSchema = z.object({
  estado: z.enum(["en_revision", "aceptada", "rechazada"]),
  respuesta: z.string().trim().max(2000).optional(),
});

/** Responder: la empresa ve el estado y el mensaje en su workspace. */
export async function responderSolicitud(id: string, input: { estado: "en_revision" | "aceptada" | "rechazada"; respuesta?: string }): Promise<Resultado<void>> {
  const parsed = respuestaSchema.safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa la respuesta.");
  return accion("calendario.responderSolicitud", async () => {
    const { db } = await conSesion();
    const { error } = await db
      .from("solicitudes")
      .update({ estado: parsed.data.estado, respuesta: parsed.data.respuesta || null })
      .eq("id", id);
    if (error) throw error;
    revalidar();
    await avisarSolicitudRespondida(id);
    return exito(undefined);
  });
}

type SolicitudBase = { id: string; cliente_id: string; titulo: string; descripcion: string | null; area: Area | null; prioridad: string; fecha_deseada: string | null; respuesta: string | null };

async function leerSolicitud(id: string) {
  const { db, usuario } = await conSesion();
  const { data } = await db.from("solicitudes").select("id, cliente_id, titulo, descripcion, area, prioridad, fecha_deseada, respuesta").eq("id", id).maybeSingle();
  return { db, usuario, s: data as SolicitudBase | null };
}

/** Convierte la solicitud en un trabajo en propuesta, visible para la empresa. */
export async function convertirEnTrabajo(id: string): Promise<Resultado<{ trabajoId: string }>> {
  return accion("calendario.convertirEnTrabajo", async () => {
    const { db, usuario, s } = await leerSolicitud(id);
    if (!s) return fallo("No encontramos la solicitud.");
    const { data, error } = await db
      .from("trabajos")
      .insert([
        {
          owner_id: usuario.id,
          cliente_id: s.cliente_id,
          area: s.area ?? "soporte",
          titulo: s.titulo,
          descripcion: s.descripcion,
          prioridad: s.prioridad,
          estado: "propuesta",
          fecha_inicio: hoyLima(),
          fecha_compromiso: s.fecha_deseada,
          visible_empresa: true,
        },
      ])
      .select("id")
      .single();
    if (error) throw error;
    const trabajoId = (data as { id: string }).id;
    const r = await db
      .from("solicitudes")
      .update({ estado: "aceptada", trabajo_id: trabajoId, respuesta: s.respuesta ?? "La tomamos: ya está en tus proyectos." })
      .eq("id", id);
    if (r.error) throw r.error;
    revalidar();
    return exito({ trabajoId });
  });
}

/** Crea una cotización en borrador con el pedido de la empresa para ponerle precio. */
export async function convertirEnCotizacion(id: string): Promise<Resultado<{ cotizacionId: string }>> {
  return accion("calendario.convertirEnCotizacion", async () => {
    const { db, usuario, s } = await leerSolicitud(id);
    if (!s) return fallo("No encontramos la solicitud.");
    const marca = await db.from("perfil_marca").select("igv_pct, moneda_default, validez_dias_default, condiciones_default").maybeSingle();
    const m = marca.data as { igv_pct: number; moneda_default: string; validez_dias_default: number; condiciones_default: string | null } | null;
    const { data, error } = await db
      .from("cotizaciones")
      .insert([
        {
          owner_id: usuario.id,
          cliente_id: s.cliente_id,
          area: s.area ?? "soporte",
          asunto: s.titulo,
          estado: "borrador",
          igv_pct: m?.igv_pct ?? 1800,
          moneda: m?.moneda_default ?? "PEN",
          validez_dias: m?.validez_dias_default ?? 15,
          condiciones: m?.condiciones_default ?? null,
          notas: s.descripcion ? `Solicitud de la empresa:\n${s.descripcion}` : null,
        },
      ])
      .select("id")
      .single();
    if (error) throw error;
    const cotizacionId = (data as { id: string }).id;
    const r = await db
      .from("solicitudes")
      .update({ estado: "en_revision", cotizacion_id: cotizacionId, respuesta: s.respuesta ?? "Estamos preparando tu cotización." })
      .eq("id", id);
    if (r.error) throw r.error;
    revalidar();
    return exito({ cotizacionId });
  });
}

export async function eliminarSolicitud(id: string): Promise<Resultado<void>> {
  return accion("calendario.eliminarSolicitud", async () => {
    const { db } = await conSesion();
    const { error } = await db.from("solicitudes").delete().eq("id", id);
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}
