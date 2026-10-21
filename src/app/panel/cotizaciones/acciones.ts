"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { aCentimos, hoyLima } from "@/lib/format";
import { porcentajeABasis } from "@/lib/validators/marca";
import { aceptacionSchema, cobroSchema, cotizacionSchema, lineaABase, pagoCotizacionSchema, type CobroInput, type CotizacionInput, type PagoCotizacionInput } from "@/lib/validators/cotizacion";
import type { CotizacionRow } from "@/types/database";
import { avisarCopiaAceptacion, avisarDocumentoEmpresa } from "@/lib/correo/avisos";

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

  return accion("cotizaciones.guardarCotizacion", async () => {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    let cotId = id;

    if (id) {
      const actual = await db.from("cotizaciones").select("estado").eq("id", id).maybeSingle();
      const estado = (actual.data as Pick<CotizacionRow, "estado"> | null)?.estado;
      if (!estado) return fallo("No encontramos la cotización.");
      if (estado === "aceptada") return fallo("Una cotización aceptada no se edita: duplícala para hacer otra versión.");
      const { error } = await db.from("cotizaciones").update(datos).eq("id", id);
      if (error) throw error;
      const borrado = await db.from("cotizacion_items").delete().eq("cotizacion_id", id);
      if (borrado.error) throw borrado.error;
    } else {
      const { data, error } = await db
        .from("cotizaciones")
        .insert([{ ...datos, owner_id: usuario.id, estado: "borrador" }])
        .select("id")
        .single();
      if (error) throw error;
      cotId = (data as { id: string }).id;
    }

    const filas = items.map((l, i) => ({ ...lineaABase(l, i + 1), cotizacion_id: cotId, owner_id: usuario.id }));
    const { error: errItems } = await db.from("cotizacion_items").insert(filas);
    if (errItems) throw errItems;

    revalidar();
    return exito({ id: cotId! });
  });
}

/** Pasa a "enviada": la empresa la ve en su workspace. Si estaba vencida, se renueva con fecha de hoy. */
export async function enviarCotizacion(id: string): Promise<Resultado<{ token: string | null }>> {
  return accion("cotizaciones.enviarCotizacion", async () => {
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
    if (error) throw error;
    // Enlace del portal: para quien no tiene workspace (ve, descarga y acepta sin entrar).
    const enlace = await db.rpc("obtener_enlace", { p_tipo: "cotizacion", p_id: id, p_renovar: false });
    await avisarDocumentoEmpresa("cotizacion", id);
    revalidar();
    return exito({ token: enlace.error ? null : (enlace.data as string) });
  });
}

/** Marca aceptada desde el panel (DNI opcional) y crea el trabajo. */
export async function aceptarCotizacion(id: string, input: { nombre: string; dni?: string }): Promise<Resultado<{ trabajoId: string | null }>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  return accion("cotizaciones.aceptarCotizacion", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.rpc("cotizacion_aceptar_panel", { p_cot: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni || null });
    if (error) throw error;
    // Constancia a la empresa: quién aceptó y cómo, con el código de versión del PDF (D5).
    await avisarCopiaAceptacion(id);
    revalidar();
    return exito({ trabajoId: (data as { trabajo_id?: string } | null)?.trabajo_id ?? null });
  });
}

export async function rechazarCotizacion(id: string, motivo: string): Promise<Resultado<void>> {
  return accion("cotizaciones.rechazarCotizacion", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db
      .from("cotizaciones")
      .update({ estado: "rechazada", rechazada_en: new Date().toISOString(), motivo_rechazo: motivo.trim() || null })
      .eq("id", id)
      .neq("estado", "aceptada");
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}

/** Copia como borrador nuevo (número nuevo, fecha de hoy). */
export async function duplicarCotizacion(id: string): Promise<Resultado<{ id: string }>> {
  return accion("cotizaciones.duplicarCotizacion", async () => {
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
    if (nueva.error) throw nueva.error;
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
      if (r.error) throw r.error;
    }
    revalidar();
    return exito({ id: nuevaId });
  });
}

export async function eliminarCotizacion(id: string): Promise<Resultado<void>> {
  return accion("cotizaciones.eliminarCotizacion", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const actual = await db.from("cotizaciones").select("estado").eq("id", id).maybeSingle();
    if ((actual.data as { estado?: string } | null)?.estado === "aceptada") {
      return fallo("Una cotización aceptada no se elimina: tiene un trabajo y quizá cobros asociados.");
    }
    const { error } = await db.from("cotizaciones").delete().eq("id", id);
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}

// ---------------------------------------------------------------------------
// Cobros
// ---------------------------------------------------------------------------
export async function registrarCobro(input: CobroInput): Promise<Resultado<{ id: string }>> {
  const parsed = cobroSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  const { monto, ...resto } = parsed.data;
  return accion("cotizaciones.registrarCobro", async () => {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    const { data, error } = await db
      .from("cobros")
      .insert([{ ...resto, monto: aCentimos(monto), owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) throw error;
    revalidar();
    return exito({ id: (data as { id: string }).id });
  });
}

/** Un cobro no se borra: se anula con motivo y deja de contar (la base impide cambiarlo o eliminarlo después). */
export async function anularCobro(id: string, motivo: string): Promise<Resultado<void>> {
  const texto = motivo.trim();
  if (texto.length < 3) return fallo("Escribe el motivo de la anulación.", "motivo");
  return accion("cotizaciones.anularCobro", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.from("cobros").update({ anulado_en: new Date().toISOString(), anulado_motivo: texto }).eq("id", id).is("anulado_en", null).select("id");
    if (error) throw error;
    if (!data || data.length === 0) return fallo("No encontramos el cobro, o ya estaba anulado.");
    revalidar();
    return exito(undefined);
  });
}

/** Anula una cotización aceptada: sale de las deudas y de los recordatorios, y la aceptación queda intacta. */
export async function anularCotizacion(id: string, motivo: string): Promise<Resultado<void>> {
  const texto = motivo.trim();
  if (texto.length < 3) return fallo("Escribe el motivo de la anulación.", "motivo");
  return accion("cotizaciones.anularCotizacion", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.rpc("cotizacion_anular", { p_id: id, p_motivo: texto });
    if (error) throw error;
    revalidar();
    return exito(undefined);
  });
}

// ---------------------------------------------------------------------------
// Plazo de pago y recordatorios
// ---------------------------------------------------------------------------
export async function actualizarPagoCotizacion(id: string, input: PagoCotizacionInput): Promise<Resultado<void>> {
  const parsed = pagoCotizacionSchema.safeParse(input);
  if (!parsed.success) return primerError(parsed.error.issues);
  return accion("cotizaciones.actualizarPagoCotizacion", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.from("cotizaciones").update(parsed.data).eq("id", id).select("id");
    if (error) throw error;
    // Sin filas: no es suya o no tiene permiso (la RLS no da error, solo no actualiza).
    if (!data?.length) return fallo("No pudimos actualizar esta cotización.");
    revalidar();
    return exito(undefined);
  });
}
