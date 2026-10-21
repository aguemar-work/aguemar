"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { accion, exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { segundosDeEspera, traducirError } from "@/lib/insforge/errores";
import { clienteSchema, type ClienteInput } from "@/lib/validators/cliente";
import { invitarEmpresaSchema, modulosSchema, type InvitarEmpresaInput } from "@/lib/validators/empresa";
import { crearClienteServidor } from "@/lib/insforge/server";
import { enlaceInvitacion } from "@/lib/invitaciones";
import { avisarInvitacion } from "@/lib/correo/avisos";
import { generarSlug } from "@/lib/slug";
import type { ClaveModulo } from "@/lib/modulos";

export async function guardarCliente(input: ClienteInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }

  return accion("clientes.guardarCliente", async () => {
    await exigirPropietario();
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

    // Slug único por propietario: base + sufijo si ya existe.
    const base = generarSlug(datos.nombre) || "empresa";
    const existentes = await db.from("clientes").select("slug").like("slug", `${base}%`);
    const usados = new Set(((existentes.data ?? []) as { slug: string | null }[]).map((c) => c.slug));
    let slug = base;
    for (let i = 2; usados.has(slug); i += 1) slug = `${base}-${i}`;

    const { data, error } = await db
      .from("clientes")
      .insert([{ ...datos, slug, owner_id: usuario.id }])
      .select("id")
      .single();
    if (error) {
      const t = traducirError(error);
      return fallo(t.mensaje, t.campo);
    }
    revalidatePath("/panel/clientes");
    revalidatePath("/panel");
    return exito({ id: (data as { id: string }).id });
  });
}

export async function eliminarCliente(id: string): Promise<Resultado<void>> {
  return accion("clientes.eliminarCliente", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const [cot, fichas] = await Promise.all([
      db.from("cotizaciones").select("id", { count: "exact", head: true }).eq("cliente_id", id),
      db.from("fichas").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    ]);
    if ((cot.count ?? 0) > 0 || (fichas.count ?? 0) > 0) {
      return fallo("Este cliente tiene cotizaciones o fichas. No se puede eliminar; puedes editarlo o dejarlo como está.");
    }
    const { error } = await db.from("clientes").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/panel/clientes");
    revalidatePath("/panel/equipos");
    revalidatePath("/panel");
    return exito(undefined);
  });
}

// ---------------------------------------------------------------------------
// Workspace: acceso y módulos
// ---------------------------------------------------------------------------
export async function actualizarModulosEmpresa(clienteId: string, modulos: ClaveModulo[]): Promise<Resultado<void>> {
  const parsed = modulosSchema.safeParse(modulos);
  if (!parsed.success) return fallo("Módulo desconocido.");
  return accion("clientes.actualizarModulosEmpresa", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("clientes").update({ modulos: parsed.data }).eq("id", clienteId);
    if (error) throw error;
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  });
}

/**
 * Invita a la empresa a su workspace: crea una invitación de un solo uso (7 días) y,
 * si Resend está activo, le manda el enlace por correo. La persona fija su contraseña;
 * el propietario ya no inventa ni comparte contraseñas (auditoría SEG-08).
 */
export async function invitarEmpresa(clienteId: string, input: InvitarEmpresaInput): Promise<Resultado<{ enlace: string }>> {
  const parsed = invitarEmpresaSchema.safeParse(input);
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Revisa el correo.", "correo");
  try {
    await exigirPropietario();
    const { db, usuario } = await conSesion();
    const empresa = await db.from("clientes").select("id, nombre, contacto, usuario_id").eq("id", clienteId).maybeSingle();
    if (empresa.error) return fallo(traducirError(empresa.error).mensaje);
    const e = empresa.data as { id: string; nombre: string; contacto: string | null; usuario_id: string | null } | null;
    if (!e) return fallo("No encontramos la empresa.");
    if (e.usuario_id) return fallo("Esta empresa ya tiene un acceso. Quítalo primero si quieres cambiar el correo.");

    // Una sola invitación pendiente por empresa: la anterior se revoca.
    await db.from("invitaciones").update({ revocada: true }).eq("cliente_id", clienteId).eq("tipo", "empresa").is("usada_en", null);
    const { data, error } = await db
      .from("invitaciones")
      .insert([{ owner_id: usuario.id, tipo: "empresa", correo: parsed.data.correo, nombre: e.contacto, cliente_id: clienteId }])
      .select("token")
      .single();
    if (error) return fallo(traducirError(error).mensaje);
    const enlace = enlaceInvitacion((data as { token: string }).token);
    avisarInvitacion({ correo: parsed.data.correo, enlace, tipo: "empresa", empresa: e.nombre, nombre: e.contacto });
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito({ enlace });
  } catch (err) {
    return fallo(traducirError(err).mensaje);
  }
}

/** Nuevo enlace (y 7 días más) para una invitación pendiente; el anterior deja de servir. */
export async function renovarInvitacion(invitacionId: string, ruta: string): Promise<Resultado<{ enlace: string }>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { data, error } = await db.rpc("invitacion_renovar", { p_id: invitacionId });
    if (error) return fallo(traducirError(error).mensaje);
    if (!data) return fallo("La invitación ya no está pendiente.");
    revalidatePath(ruta);
    return exito({ enlace: enlaceInvitacion(data as string) });
  } catch (err) {
    return fallo(traducirError(err).mensaje);
  }
}

/** Anula una invitación pendiente: su enlace deja de funcionar. */
export async function revocarInvitacion(invitacionId: string, ruta: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("invitaciones").update({ revocada: true }).eq("id", invitacionId).is("usada_en", null);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath(ruta);
    return exito(undefined);
  } catch (err) {
    return fallo(traducirError(err).mensaje);
  }
}

/**
 * Quita el acceso de la empresa: desvincula su usuario. Corta al instante, porque
 * cada consulta del workspace revisa ese vínculo (aunque su sesión siga abierta).
 */
export async function quitarAccesoEmpresa(clienteId: string): Promise<Resultado<void>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("clientes").update({ usuario_id: null }).eq("id", clienteId);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  } catch (err) {
    return fallo(traducirError(err).mensaje);
  }
}

/**
 * Envía a la empresa el código de recuperación de InsForge: con él fija una contraseña
 * nueva en /login/recuperar. Reemplaza a "restablecer contraseña" desde el panel.
 */
export async function enviarRecuperacionEmpresa(clienteId: string): Promise<Resultado<{ correo: string }>> {
  try {
    await exigirPropietario();
    const { db } = await conSesion();
    const empresa = await db.from("clientes").select("usuario_id").eq("id", clienteId).maybeSingle();
    const usuarioId = (empresa.data as { usuario_id: string | null } | null)?.usuario_id;
    if (!usuarioId) return fallo("Esta empresa no tiene acceso.");
    const correo = (await db.rpc("ws_correo_usuario", { p_usuario: usuarioId })).data as string | null;
    if (!correo) return fallo("No encontramos el correo de acceso.");
    const insforge = await crearClienteServidor();
    if (!insforge) return fallo("InsForge no está configurado.");
    const { error } = await insforge.auth.sendResetPasswordEmail({ email: correo });
    if (error) {
      const espera = segundosDeEspera(error);
      if (espera !== null) {
        return fallo(`Ya se envió un código a ${correo} hace poco y sigue vigente. Podrás enviar otro en ${espera} segundos.`);
      }
      return fallo(`No se pudo enviar el código: ${error.message}`);
    }
    return exito({ correo });
  } catch (err) {
    return fallo(traducirError(err).mensaje);
  }
}

/** Activa o desactiva los avisos por correo a la empresa. */
export async function cambiarAvisosEmpresa(clienteId: string, avisos: boolean): Promise<Resultado<void>> {
  return accion("clientes.cambiarAvisosEmpresa", async () => {
    await exigirPropietario();
    const { db } = await conSesion();
    const { error } = await db.from("clientes").update({ avisos_correo: avisos }).eq("id", clienteId);
    if (error) throw error;
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  });
}
