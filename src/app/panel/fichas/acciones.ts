"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { EQUIPO_NUEVO, fichaSchema, type FichaInput } from "@/lib/validators/ficha";
import type { TipoDocumento } from "@/types/database";
import { avisarDocumentoEmpresa } from "@/lib/correo/avisos";

function revalidar() {
  revalidatePath("/panel", "layout");
  revalidatePath("/w", "layout");
  revalidatePath("/d", "layout");
}

type Db = Awaited<ReturnType<typeof conSesion>>["db"];

/** Quita los campos vacíos para no pisar datos del equipo con null al actualizar. */
function soloConValor<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== "")) as Partial<T>;
}

/**
 * Resuelve el equipo de la ficha:
 * - "__nuevo": busca por serie en la empresa; si existe lo actualiza, si no lo crea.
 * - id existente con actualizar_equipo: completa sus datos con los del diagnóstico.
 */
async function resolverEquipo(db: Db, ownerId: string, clienteId: string, datos: ReturnType<typeof fichaSchema.parse>): Promise<Resultado<string | null>> {
  const equipo = soloConValor(datos.equipo_datos);
  if (datos.equipo_id === EQUIPO_NUEVO) {
    const existente = await db.from("equipos").select("id").eq("cliente_id", clienteId).eq("serie", equipo.serie!).maybeSingle();
    const id = (existente.data as { id: string } | null)?.id;
    if (id) {
      const { error } = await db.from("equipos").update(equipo).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      return exito(id);
    }
    const { data, error } = await db
      .from("equipos")
      .insert([{ ...equipo, cliente_id: clienteId, owner_id: ownerId }])
      .select("id")
      .single();
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo ? `equipo_datos.${t.campo}` : undefined);
    }
    return exito((data as { id: string }).id);
  }
  if (!datos.equipo_id) return exito(null);
  if (datos.actualizar_equipo) {
    const { serie: _serie, ...sinSerie } = equipo;
    void _serie;
    if (Object.keys(sinSerie).length) {
      const { error } = await db.from("equipos").update(sinSerie).eq("id", datos.equipo_id);
      if (error) return fallo(traducirError(error).mensaje);
    }
  }
  return exito(datos.equipo_id);
}

export async function guardarFicha(input: FichaInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = fichaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path.map(String).join("."));
  }
  const d = parsed.data;

  try {
    const { db, usuario } = await conSesion();
    const equipo = await resolverEquipo(db, usuario.id, d.cliente_id, d);
    if (!equipo.ok) return equipo;

    const fila = {
      cliente_id: d.cliente_id,
      equipo_id: equipo.data,
      trabajo_id: d.trabajo_id,
      fecha: d.fecha,
      tipo_servicio: d.tipo_servicio,
      modalidad: d.modalidad,
      titular: d.titular,
      resumen: d.resumen ?? null,
      estado_final: d.estado_final,
      indicadores: d.indicadores,
      proximo_mantenimiento: d.proximo_mantenimiento ?? null,
      ...(d.diagnostico_origen !== undefined ? { diagnostico_origen: d.diagnostico_origen } : {}),
    };

    let fichaId = id;
    if (id) {
      const { error } = await db.from("fichas").update(fila).eq("id", id);
      if (error) return fallo(traducirError(error).mensaje);
      const borrados = await Promise.all(
        ["ficha_diagnosticos", "ficha_trabajos", "ficha_incidencias", "ficha_recomendaciones"].map((t) => db.from(t).delete().eq("ficha_id", id)),
      );
      const conError = borrados.find((r) => r.error);
      if (conError?.error) return fallo(traducirError(conError.error).mensaje);
    } else {
      const { data, error } = await db
        .from("fichas")
        .insert([{ ...fila, owner_id: usuario.id }])
        .select("id")
        .single();
      if (error) return fallo(traducirError(error).mensaje);
      fichaId = (data as { id: string }).id;
    }

    const base = { ficha_id: fichaId, owner_id: usuario.id };
    const inserciones = [
      d.diagnosticos.length ? db.from("ficha_diagnosticos").insert(d.diagnosticos.map((x, i) => ({ ...x, ...base, orden: i + 1 }))) : null,
      d.trabajos.length ? db.from("ficha_trabajos").insert(d.trabajos.map((x, i) => ({ ...x, detalle: x.detalle ?? null, ...base, orden: i + 1 }))) : null,
      d.incidencias.length
        ? db.from("ficha_incidencias").insert(d.incidencias.map((x, i) => ({ ...x, causa: x.causa ?? null, solucion: x.solucion ?? null, ...base, orden: i + 1 })))
        : null,
      d.recomendaciones.length ? db.from("ficha_recomendaciones").insert(d.recomendaciones.map((x, i) => ({ texto: x.texto, ...base, orden: i + 1 }))) : null,
    ].filter(Boolean);
    const resultados = await Promise.all(inserciones);
    const errorFilas = resultados.find((r) => r?.error);
    if (errorFilas?.error) return fallo(traducirError(errorFilas.error).mensaje);

    revalidar();
    return exito({ id: fichaId! });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Publicar: la empresa la ve en su workspace y el enlace público queda activo. */
export async function publicarFicha(id: string, publicar: boolean): Promise<Resultado<{ token: string | null }>> {
  try {
    const { db } = await conSesion();
    const { error } = await db
      .from("fichas")
      .update({ publicada: publicar, publicada_en: publicar ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    let token: string | null = null;
    if (publicar) {
      const r = await db.rpc("obtener_enlace", { p_tipo: "ficha", p_id: id, p_renovar: false });
      if (r.error) return fallo(traducirError(r.error).mensaje);
      token = r.data as string;
      await avisarDocumentoEmpresa("ficha", id);
    }
    revalidar();
    return exito({ token });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarFicha(id: string): Promise<Resultado<void>> {
  try {
    // Solo el propietario (el colaborador no borra ni reorganiza): mensaje claro en vez de un falso éxito.
    await exigirPropietario();
    const { db } = await conSesion();
    await db.from("enlaces_publicos").delete().eq("tipo", "ficha").eq("documento_id", id);
    const { error } = await db.from("fichas").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Enlaces públicos (fichas y cotizaciones)
// ---------------------------------------------------------------------------
/** Obtiene (o crea) el enlace; con renovar, cambia el token y el anterior deja de funcionar. */
export async function enlaceDocumento(tipo: TipoDocumento, id: string, renovar = false): Promise<Resultado<{ token: string }>> {
  try {
    const { db } = await conSesion();
    const { data, error } = await db.rpc("obtener_enlace", { p_tipo: tipo, p_id: id, p_renovar: renovar });
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito({ token: data as string });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function revocarEnlace(tipo: TipoDocumento, id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("enlaces_publicos").update({ revocado: true }).eq("tipo", tipo).eq("documento_id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidar();
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
