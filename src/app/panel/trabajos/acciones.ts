"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { aCentimos, hoyLima } from "@/lib/format";
import { entregableSchema, etapaSchema, tareaSchema, trabajoSchema, type EntregableInput, type TrabajoInput } from "@/lib/validators/trabajo";
import type { EstadoTrabajo } from "@/types/database";

function revalidar(id?: string, clienteId?: string | null) {
  revalidatePath("/panel/trabajos");
  revalidatePath("/panel");
  if (id) revalidatePath(`/panel/trabajos/${id}`);
  if (clienteId) revalidatePath(`/panel/clientes/${clienteId}`);
}

// ---------------------------------------------------------------------------
// Trabajo
// ---------------------------------------------------------------------------
export async function guardarTrabajo(input: TrabajoInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = trabajoSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const { monto_estimado_texto, ...resto } = parsed.data;
  const datos = { ...resto, monto_estimado: monto_estimado_texto ? aCentimos(monto_estimado_texto) : null };

  try {
    const { db, usuario } = await conSesion();
    const consulta = id
      ? db.from("trabajos").update(datos).eq("id", id).select("id, cliente_id").single()
      : db
          .from("trabajos")
          .insert([{ ...datos, owner_id: usuario.id }])
          .select("id, cliente_id")
          .single();
    const { data, error } = await consulta;
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    const fila = data as { id: string; cliente_id: string | null };
    revalidar(fila.id, fila.cliente_id);
    return exito({ id: fila.id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Si el trabajo se canceló y su cotización sigue aceptada, la devuelve para ofrecer anularla (solo la ve el propietario). */
export async function cambiarEstadoTrabajo(id: string, estado: EstadoTrabajo): Promise<Resultado<{ cotizacion: { id: string; numero: string | null } | null }>> {
  const ok = z.enum(["propuesta", "en_curso", "en_revision", "entregado", "cerrado", "cancelado"]).safeParse(estado);
  if (!ok.success) return fallo("Estado inválido.");
  try {
    const { db } = await conSesion();
    const cambios: Record<string, unknown> = { estado };
    if (estado === "entregado") cambios.fecha_entrega = hoyLima();
    const { data, error } = await db.from("trabajos").update(cambios).eq("id", id).select("cliente_id").single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(id, (data as { cliente_id: string | null }).cliente_id);
    let cotizacion: { id: string; numero: string | null } | null = null;
    if (estado === "cancelado") {
      const c = await db.from("cotizaciones").select("id, numero").eq("trabajo_id", id).eq("estado", "aceptada").limit(1).maybeSingle();
      cotizacion = (c.data as { id: string; numero: string | null } | null) ?? null;
    }
    return exito({ cotizacion });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function cambiarVisibilidadTrabajo(id: string, visible: boolean): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { data, error } = await db.from("trabajos").update({ visible_empresa: visible }).eq("id", id).select("cliente_id").single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(id, (data as { cliente_id: string | null }).cliente_id);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarTrabajo(id: string): Promise<Resultado<void>> {
  try {
    // Solo el propietario (el colaborador no borra ni reorganiza): mensaje claro en vez de un falso éxito.
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.from("trabajos").delete().eq("id", id).select("cliente_id").maybeSingle();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(undefined, (data as { cliente_id: string | null } | null)?.cliente_id);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Etapas y tareas
// ---------------------------------------------------------------------------
export async function agregarEtapa(trabajoId: string, titulo: string): Promise<Resultado<{ id: string }>> {
  const parsed = etapaSchema.safeParse({ titulo });
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el nombre.");
  try {
    // Solo el propietario organiza las etapas (el colaborador trabaja tareas y entregables).
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    const ultimo = await db.from("trabajo_etapas").select("orden").eq("trabajo_id", trabajoId).order("orden", { ascending: false }).limit(1).maybeSingle();
    const orden = ((ultimo.data as { orden: number } | null)?.orden ?? 0) + 1;
    const { data, error } = await db
      .from("trabajo_etapas")
      .insert([{ trabajo_id: trabajoId, titulo: parsed.data.titulo, orden, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function renombrarEtapa(id: string, trabajoId: string, titulo: string): Promise<Resultado<void>> {
  const parsed = etapaSchema.safeParse({ titulo });
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el nombre.");
  try {
    // Solo el propietario (el colaborador no borra ni reorganiza): mensaje claro en vez de un falso éxito.
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_etapas").update({ titulo: parsed.data.titulo }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function marcarEtapa(id: string, trabajoId: string, hecha: boolean): Promise<Resultado<void>> {
  try {
    // Solo el propietario organiza las etapas (el colaborador trabaja tareas y entregables).
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_etapas").update({ hecha }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarEtapa(id: string, trabajoId: string): Promise<Resultado<void>> {
  try {
    // Solo el propietario (el colaborador no borra ni reorganiza): mensaje claro en vez de un falso éxito.
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_etapas").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function reordenarEtapas(trabajoId: string, ids: string[]): Promise<Resultado<void>> {
  try {
    // Solo el propietario organiza las etapas (el colaborador trabaja tareas y entregables).
    await exigirPropietario();
    const { db } = await conSesion();
    const rs = await Promise.all(ids.map((id, i) => db.from("trabajo_etapas").update({ orden: i + 1 }).eq("id", id)));
    const conError = rs.find((r) => r.error);
    if (conError?.error) return fallo(traducirError(conError.error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function agregarTarea(
  trabajoId: string,
  input: { titulo: string; etapa_id?: string | null; fecha_limite?: string | null },
): Promise<Resultado<{ id: string }>> {
  const parsed = tareaSchema.safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa la tarea.");
  try {
    const { db, usuario } = await conSesion();
    const ultimo = await db.from("trabajo_tareas").select("orden").eq("trabajo_id", trabajoId).order("orden", { ascending: false }).limit(1).maybeSingle();
    const orden = ((ultimo.data as { orden: number } | null)?.orden ?? 0) + 1;
    const { data, error } = await db
      .from("trabajo_tareas")
      .insert([
        {
          trabajo_id: trabajoId,
          etapa_id: parsed.data.etapa_id ?? null,
          titulo: parsed.data.titulo,
          fecha_limite: parsed.data.fecha_limite ?? null,
          orden,
          owner_id: usuario.id,
        },
      ])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function marcarTarea(id: string, trabajoId: string, hecha: boolean): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_tareas").update({ hecha }).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function editarTarea(
  id: string,
  trabajoId: string,
  input: { titulo: string; fecha_limite?: string | null },
): Promise<Resultado<void>> {
  const parsed = tareaSchema.pick({ titulo: true, fecha_limite: true }).safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa la tarea.");
  try {
    const { db } = await conSesion();
    const { error } = await db
      .from("trabajo_tareas")
      .update({ titulo: parsed.data.titulo, fecha_limite: parsed.data.fecha_limite ?? null })
      .eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarTarea(id: string, trabajoId: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_tareas").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Entregables
// ---------------------------------------------------------------------------
export async function guardarEntregable(trabajoId: string, input: EntregableInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = entregableSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa el entregable.", issue?.path[0]?.toString());
  }
  try {
    const { db, usuario } = await conSesion();
    if (id) {
      const { error } = await db.from("trabajo_entregables").update(parsed.data).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      revalidar(trabajoId);
      return exito({ id });
    }
    const ultimo = await db.from("trabajo_entregables").select("orden").eq("trabajo_id", trabajoId).order("orden", { ascending: false }).limit(1).maybeSingle();
    const orden = ((ultimo.data as { orden: number } | null)?.orden ?? 0) + 1;
    const { data, error } = await db
      .from("trabajo_entregables")
      .insert([{ ...parsed.data, trabajo_id: trabajoId, orden, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarEntregable(id: string, trabajoId: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("trabajo_entregables").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar(trabajoId);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
