"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { aCentimos, hoyLima } from "@/lib/format";
import { porcentajeABasis } from "@/lib/validators/marca";
import { aceptacionSchema, cobroSchema, cotizacionSchema, lineaABase, pagoCotizacionSchema, type CobroInput, type CotizacionInput, type PagoCotizacionInput } from "@/lib/validators/cotizacion";
import type { CotizacionRow } from "@/types/database";
import { avisarDocumentoEmpresa } from "@/lib/correo/avisos";

/** Cotizaciones, trabajos, empresas, inicio y workspaces: todo lo que muestra montos o estados. */
function revalidar() {
  revalidatePath("/panel", "layout");
  revalidatePath("/w", "layout");
}

function primerError(issues: { message: string; path: PropertyKey[] }[]) {
  const issue = issues[0];
  const campo = issue?.path.map(String).join(".");
  return fallo<never>(issue?.message ?? "Revisa los datos.", campo);
}

// ---------------------------------------------------------------------------
// Cotización
// ---------------------------------------------------------------------------
export async function guardarCotizacion(input: CotizacionInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = cotizacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  const { items, igv_porcentaje, ...resto } = parsed.data;
  const datos = { ...resto, igv_pct: porcentajeABasis(igv_porcentaje) };

  try {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    let cotId = id;

    if (id) {
      const actual = await db.from("cotizaciones").select("estado").eq("id", id).maybeSingle();
      const estado = (actual.data as Pick<CotizacionRow, "estado"> | null)?.estado;
      if (!estado) return fallo("No encontramos la cotización.");
      if (estado === "aceptada") return fallo("Una cotización aceptada no se edita: duplícala para hacer otra versión.");
      const { error } = await db.from("cotizaciones").update(datos).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      const borrado = await db.from("cotizacion_items").delete().eq("cotizacion_id", id);
      if (borrado.error) return fallo(traducirError(borrado.error).mensaje);
    } else {
      const { data, error } = await db
        .from("cotizaciones")
        .insert([{ ...datos, owner_id: usuario.id, estado: "borrador" }])
        .select("id")
        .single();
      if (error) return fallo(traducirError(error).mensaje);
      cotId = (data as { id: string }).id;
    }

    const filas = items.map((l, i) => ({ ...lineaABase(l, i + 1), cotizacion_id: cotId, owner_id: usuario.id }));
    const { error: errItems } = await db.from("cotizacion_items").insert(filas);
    if (errItems) return fallo(traducirError(errItems).mensaje);

    revalidar();
    return exito({ id: cotId! });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Pasa a "enviada": la empresa la ve en su workspace. Si estaba vencida, se renueva con fecha de hoy. */
export async function enviarCotizacion(id: string): Promise<Resultado<{ token: string | null }>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const actual = await db.from("cotizaciones").select("estado, total").eq("id", id).maybeSingle();
    const c = actual.data as Pick<CotizacionRow, "estado" | "total"> | null;
    if (!c) return fallo("No encontramos la cotización.");
    if (c.estado === "aceptada") return fallo("Esta cotización ya fue aceptada.");
    if (c.total <= 0) return fallo("Agrega al menos una línea con importe antes de enviarla.");
    const cambios: Record<string, unknown> = { estado: "enviada", enviada_en: new Date().toISOString(), rechazada_en: null, motivo_rechazo: null };
    if (c.estado === "vencida" || c.estado === "rechazada") cambios.fecha = hoyLima();
    const { error } = await db.from("cotizaciones").update(cambios).eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    // Enlace del portal: para quien no tiene workspace (ve, descarga y acepta sin entrar).
    const enlace = await db.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: id, p_renovar: false });
    await avisarDocumentoEmpresa("cotizacion", id);
    revalidar();
    return exito({ token: enlace.error ? null : (enlace.data as string) });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Marca aceptada desde el panel (DNI opcional) y crea el trabajo. */
export async function aceptarCotizacion(id: string, input: { nombre: string; dni?: string }): Promise<Resultado<{ trabajoId: string | null }>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.rpc("cotizacion_aceptar_panel", { p_cot: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni || null });
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ trabajoId: (data as { trabajo_id?: string } | null)?.trabajo_id ?? null });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function rechazarCotizacion(id: string, motivo: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db
      .from("cotizaciones")
      .update({ estado: "rechazada", rechazada_en: new Date().toISOString(), motivo_rechazo: motivo.trim() || null })
      .eq("id", id)
      .neq("estado", "aceptada");
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Copia como borrador nuevo (número nuevo, fecha de hoy). */
export async function duplicarCotizacion(id: string): Promise<Resultado<{ id: string }>> {
  try {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    const { data, error } = await db.from("cotizaciones").select("*, cotizacion_items(*)").eq("id", id).maybeSingle();
    if (error || !data) return fallo(error ? traducirError(error).mensaje : "No encontramos la cotización.");
    const o = data as CotizacionRow & { cotizacion_items: { servicio_id: string | null; descripcion: string; unidad: string; cantidad: number | string; precio_unitario: number; descuento: number; orden: number }[] };
    const nueva = await db
      .from("cotizaciones")
      .insert([
        {
          owner_id: usuario.id,
          cliente_id: o.cliente_id,
          area: o.area,
          asunto: o.asunto,
          fecha: hoyLima(),
          validez_dias: o.validez_dias,
          moneda: o.moneda,
          igv_pct: o.igv_pct,
          igv_modo: o.igv_modo,
          condiciones: o.condiciones,
          notas: o.notas,
          estado: "borrador",
        },
      ])
      .select("id")
      .single();
    if (nueva.error) return fallo(traducirError(nueva.error).mensaje);
    const nuevaId = (nueva.data as { id: string }).id;
    if (o.cotizacion_items.length) {
      const items = o.cotizacion_items.map((i) => ({
        owner_id: usuario.id,
        cotizacion_id: nuevaId,
        servicio_id: i.servicio_id,
        descripcion: i.descripcion,
        unidad: i.unidad,
        cantidad: Number(i.cantidad),
        precio_unitario: i.precio_unitario,
        descuento: i.descuento,
        orden: i.orden,
      }));
      const r = await db.from("cotizacion_items").insert(items);
      if (r.error) return fallo(traducirError(r.error).mensaje);
    }
    revalidar();
    return exito({ id: nuevaId });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarCotizacion(id: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const actual = await db.from("cotizaciones").select("estado").eq("id", id).maybeSingle();
    if ((actual.data as { estado?: string } | null)?.estado === "aceptada") {
      return fallo("Una cotización aceptada no se elimina: tiene un trabajo y quizá cobros asociados.");
    }
    const { error } = await db.from("cotizaciones").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Cobros
// ---------------------------------------------------------------------------
export async function registrarCobro(input: CobroInput): Promise<Resultado<{ id: string }>> {
  const parsed = cobroSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  const { monto, ...resto } = parsed.data;
  try {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    const { data, error } = await db
      .from("cobros")
      .insert([{ ...resto, monto: aCentimos(monto), owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ id: (data as { id: string }).id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarCobro(id: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("cobros").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Plazo de pago y recordatorios
// ---------------------------------------------------------------------------
export async function actualizarPagoCotizacion(id: string, input: PagoCotizacionInput): Promise<Resultado<void>> {
  const parsed = pagoCotizacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.from("cotizaciones").update(parsed.data).eq("id", id).select("id");
    if (error) return fallo(traducirError(error).mensaje);
    // Sin filas: no es suya o no tiene permiso (la RLS no da error, solo no actualiza).
    if (!data?.length) return fallo("No pudimos actualizar esta cotización.");
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
