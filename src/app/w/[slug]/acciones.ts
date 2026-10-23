"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearClienteServidor, obtenerUsuario } from "@/lib/insforge/server";
import { accion, exito, fallo, type Resultado, falloDe } from "@/lib/datos/resultado";
import { segundosDeEspera } from "@/lib/insforge/errores";
import type { EntidadComentario } from "@/types/database";
import { ws } from "@/lib/datos/workspace";
import { avisarAceptacion, avisarComentarioEmpresa, avisarReunionPedida, avisarSolicitud, avisosActivos } from "@/lib/correo/avisos";

/** Nombre de mi empresa, para los avisos (se resuelve después de responder). */
const nombreEmpresa = () => ws.miEmpresa().then((e) => e?.nombre ?? null, () => null);

function tituloDe(entidad: EntidadComentario, id: string): Promise<string | null> {
  const t =
    entidad === "trabajo"
      ? ws.trabajo(id).then((x) => x?.titulo ?? null)
      : entidad === "actividad"
        ? ws.actividad(id).then((x) => x?.titulo ?? null)
        : entidad === "informe"
          ? ws.informe(id).then((x) => (x ? `${x.numero} · ${x.titulo}` : null))
          : entidad === "cotizacion"
            ? ws.cotizacion(id).then((x) => (x ? `${x.numero} · ${x.asunto}` : null))
            : Promise.resolve(null);
  return t.catch(() => null);
}

const textoSchema = z.string().trim().min(1, "Escribe un comentario.").max(4000);

/** La empresa comenta una entidad suya (vía ws_comentar, que valida pertenencia). */
export async function comentarEmpresa(slug: string, entidad: EntidadComentario, entidadId: string, texto: string): Promise<Resultado<{ id: string }>> {
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el texto.");
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { data, error } = await insforge.database.rpc("ws_comentar", { p_entidad: entidad, p_id: entidadId, p_texto: parsed.data });
  if (error) return falloDe(error, "workspace.comentarEmpresa");
  if (entidad === "trabajo") revalidatePath(`/w/${slug}/proyectos/${entidadId}`);
  if (entidad === "actividad") revalidatePath(`/w/${slug}/calendario/${entidadId}`);
  if (entidad === "informe") revalidatePath(`/w/${slug}/informes/${entidadId}`);
  if (entidad === "cotizacion") revalidatePath(`/w/${slug}/cotizaciones/${entidadId}`);
  revalidatePath("/panel", "layout");
  revalidatePath(`/w/${slug}`);
  if (avisosActivos()) avisarComentarioEmpresa({ empresa: nombreEmpresa(), entidad, entidadId, titulo: tituloDe(entidad, entidadId), texto: parsed.data });
  return exito({ id: data as string });
}

const aceptacionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
  dni: z.string().trim().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
});

/** La empresa acepta una cotización suya (ws_aceptar_cotizacion valida pertenencia y vigencia, y crea el trabajo). */
export async function aceptarCotizacionEmpresa(slug: string, id: string, input: { nombre: string; dni: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { data, error } = await insforge.database.rpc("ws_aceptar_cotizacion", { p_id: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni });
  if (error) return falloDe(error, "workspace.aceptarCotizacionEmpresa");
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath("/panel", "layout");
  const r = data as { ya_aceptada?: boolean; numero?: string } | null;
  if (avisosActivos() && !r?.ya_aceptada) avisarAceptacion({ tipo: "cotizacion", numero: r?.numero ?? null, nombre: parsed.data.nombre, empresa: nombreEmpresa(), via: "workspace" });
  return exito(undefined);
}

/** La empresa acepta un acta de entrega publicada (ws_aceptar_acta valida empresa y publicación; el trabajo pasa a entregado). */
export async function aceptarActaEmpresa(slug: string, id: string, input: { nombre: string; dni: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { data, error } = await insforge.database.rpc("ws_aceptar_acta", { p_id: id, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni });
  if (error) return falloDe(error, "workspace.aceptarActaEmpresa");
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath("/panel", "layout");
  const r = data as { ya_aceptada?: boolean; numero?: string } | null;
  if (avisosActivos() && !r?.ya_aceptada) avisarAceptacion({ tipo: "acta", numero: r?.numero ?? null, nombre: parsed.data.nombre, empresa: nombreEmpresa(), via: "workspace" });
  return exito(undefined);
}

const solicitudEmpresaSchema = z.object({
  titulo: z.string().trim().min(3, "Cuéntanos en pocas palabras qué necesitas.").max(200),
  descripcion: z.string().trim().max(4000).optional(),
  area: z.enum(["", "diseno", "desarrollo", "soporte"]).optional(),
  prioridad: z.enum(["baja", "media", "alta"]),
  fecha_deseada: z.string().optional(),
});

/** La empresa pide un trabajo (ws_solicitar valida módulo, límites y fecha). */
export async function solicitarEmpresa(slug: string, input: z.input<typeof solicitudEmpresaSchema>): Promise<Resultado<{ id: string }>> {
  const parsed = solicitudEmpresaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const d = parsed.data;
  const { data, error } = await insforge.database.rpc("ws_solicitar", {
    p_titulo: d.titulo,
    p_descripcion: d.descripcion || null,
    p_area: d.area || null,
    p_prioridad: d.prioridad,
    p_fecha_deseada: d.fecha_deseada || null,
  });
  if (error) return falloDe(error, "workspace.solicitarEmpresa");
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath("/panel", "layout");
  if (avisosActivos()) avisarSolicitud({ empresa: nombreEmpresa(), titulo: d.titulo, descripcion: d.descripcion, prioridad: d.prioridad, fecha_deseada: d.fecha_deseada || null });
  return exito({ id: data as string });
}

const reunionEmpresaSchema = z.object({
  tema: z.string().trim().min(3, "Cuéntanos de qué quieres hablar.").max(200),
  detalle: z.string().trim().max(4000).optional(),
  fecha: z.string().min(1, "Elige el día que prefieres."),
  hora: z.string().optional(),
  modalidad: z.enum(["virtual", "presencial"]),
});

/** La empresa pide una reunión; no entra al calendario hasta que el propietario la confirma (ws_pedir_reunion valida módulo, fecha y tope). */
export async function pedirReunion(slug: string, input: z.input<typeof reunionEmpresaSchema>): Promise<Resultado<{ id: string }>> {
  const parsed = reunionEmpresaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const d = parsed.data;
  const { data, error } = await insforge.database.rpc("ws_pedir_reunion", {
    p_tema: d.tema,
    p_detalle: d.detalle || null,
    p_fecha: d.fecha,
    p_hora: d.hora || null,
    p_modalidad: d.modalidad,
  });
  if (error) return falloDe(error, "workspace.pedirReunion");
  revalidatePath(`/w/${slug}`, "layout");
  revalidatePath("/panel", "layout");
  if (avisosActivos()) avisarReunionPedida({ empresa: nombreEmpresa(), tema: d.tema, detalle: d.detalle, fecha: d.fecha, hora: d.hora || null, modalidad: d.modalidad });
  return exito({ id: data as string });
}

/** "Mi cuenta": la empresa elige si recibe avisos por correo (ws_preferencias_guardar cambia solo su propia empresa). */
export async function guardarAvisosCuenta(slug: string, avisos: boolean): Promise<Resultado<void>> {
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("Sin sesión.");
  const { error } = await insforge.database.rpc("ws_preferencias_guardar", { p_avisos: avisos });
  if (error) return falloDe(error, "workspace.guardarAvisosCuenta");
  revalidatePath(`/w/${slug}/cuenta`);
  return exito(undefined);
}

/**
 * "Mi cuenta": manda el código de 6 dígitos al correo de la sesión para fijar una contraseña nueva.
 * El SDK no cambia la contraseña con la actual; el camino es el mismo código de /login/recuperar.
 */
export async function pedirCodigoCuenta(): Promise<Resultado<{ correo: string; mensaje: string }>> {
  return accion("workspace.pedirCodigoCuenta", async () => {
    const usuario = await obtenerUsuario();
    const insforge = await crearClienteServidor();
    if (!usuario?.email || !insforge) return fallo("Sin sesión.");
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: usuario.email });
    if (error) {
      // Un código reciente sigue vigente: se pasa a escribirlo en vez de dar error.
      const espera = segundosDeEspera(error);
      if (espera !== null) {
        return exito({ correo: usuario.email, mensaje: `Ya enviamos un código a ${usuario.email} hace poco y sigue vigente. Escríbelo aquí; si no llegó, podrás pedir otro en ${espera} segundos.` });
      }
      throw error;
    }
    return exito({ correo: usuario.email, mensaje: `Te enviamos un código de 6 dígitos a ${usuario.email}. Revisa también el spam.` });
  });
}
