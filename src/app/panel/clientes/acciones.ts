"use server";

import { revalidatePath } from "next/cache";
import { conSesion, exigirPropietario } from "@/lib/datos/base";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { clienteSchema, type ClienteInput } from "@/lib/validators/cliente";
import { accesoEmpresaSchema, modulosSchema, nuevaContrasenaSchema, type AccesoEmpresaInput } from "@/lib/validators/empresa";
import { crearUsuarioInsforge } from "@/lib/insforge/admin";
import { generarSlug } from "@/lib/slug";
import type { ClaveModulo } from "@/lib/modulos";

export async function guardarCliente(input: ClienteInput, id?: string): Promise<Resultado<{ id: string }>> {
  const parsed = clienteSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }

  try {
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
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function eliminarCliente(id: string): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const [cot, fichas] = await Promise.all([
      db.from("cotizaciones").select("id", { count: "exact", head: true }).eq("cliente_id", id),
      db.from("fichas").select("id", { count: "exact", head: true }).eq("cliente_id", id),
    ]);
    if ((cot.count ?? 0) > 0 || (fichas.count ?? 0) > 0) {
      return fallo("Este cliente tiene cotizaciones o fichas. No se puede eliminar; puedes editarlo o dejarlo como está.");
    }
    const { error } = await db.from("clientes").delete().eq("id", id);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath("/panel/clientes");
    revalidatePath("/panel/equipos");
    revalidatePath("/panel");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

// ---------------------------------------------------------------------------
// Workspace: acceso y módulos
// ---------------------------------------------------------------------------
export async function actualizarModulosEmpresa(clienteId: string, modulos: ClaveModulo[]): Promise<Resultado<void>> {
  const parsed = modulosSchema.safeParse(modulos);
  if (!parsed.success) return fallo("Módulo desconocido.");
  try {
    const { db } = await conSesion();
    const { error } = await db.from("clientes").update({ modulos: parsed.data }).eq("id", clienteId);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function crearAccesoEmpresa(clienteId: string, input: AccesoEmpresaInput): Promise<Resultado<{ usuarioId: string }>> {
  const parsed = accesoEmpresaSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  try {
    // Crear el usuario en InsForge no pasa por la RLS: solo el propietario (auditoría SEG-03).
    await exigirPropietario();
    const { db } = await conSesion();
    const actual = await db.from("clientes").select("id, nombre, usuario_id").eq("id", clienteId).maybeSingle();
    if (actual.error) return fallo(traducirError(actual.error).mensaje);
    const empresa = actual.data as { id: string; nombre: string; usuario_id: string | null } | null;
    if (!empresa) return fallo("No encontramos la empresa.");
    if (empresa.usuario_id) return fallo("Esta empresa ya tiene un acceso. Usa 'Restablecer contraseña'.");

    const creado = await crearUsuarioInsforge(parsed.data.correo, parsed.data.contrasena, empresa.nombre);
    if (!creado.id) return fallo(creado.error ?? "No se pudo crear el usuario.", "correo");

    const { error } = await db.from("clientes").update({ usuario_id: creado.id }).eq("id", clienteId);
    if (error) return fallo(`El usuario se creó pero no se pudo vincular: ${traducirError(error).mensaje}`);
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito({ usuarioId: creado.id });
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

export async function restablecerContrasenaEmpresa(clienteId: string, usuarioId: string, contrasena: string): Promise<Resultado<void>> {
  const parsed = nuevaContrasenaSchema.safeParse({ contrasena });
  if (!parsed.success) return fallo(parsed.error.issues[0]?.message ?? "Contraseña inválida.");
  try {
    const { db } = await conSesion();
    const { error } = await db.rpc("ws_admin_set_password", { p_usuario: usuarioId, p_password: parsed.data.contrasena });
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}

/** Activa o desactiva los avisos por correo a la empresa. */
export async function cambiarAvisosEmpresa(clienteId: string, avisos: boolean): Promise<Resultado<void>> {
  try {
    const { db } = await conSesion();
    const { error } = await db.from("clientes").update({ avisos_correo: avisos }).eq("id", clienteId);
    if (error) return fallo(traducirError(error).mensaje);
    revalidatePath(`/panel/clientes/${clienteId}`);
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
