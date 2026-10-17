"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { segundosDeEspera } from "@/lib/insforge/errores";
import { crearAccionesAuth, crearClienteServidor, obtenerRol, rutaInicio } from "@/lib/insforge/server";

const correoSchema = z.string().trim().email("Escribe un correo válido.");
const contrasenaSchema = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");
const codigoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "El código tiene 6 dígitos.");

const SIN_BACKEND = "InsForge no está configurado. Completa .env.local para iniciar sesión.";

function rutaSegura(valor: FormDataEntryValue | null): string {
  const s = String(valor ?? "/panel");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/panel";
}

// ---------------------------------------------------------------------------
// Login con correo y contraseña
// ---------------------------------------------------------------------------
export interface EstadoLogin {
  ok: boolean;
  mensaje?: string;
  campo?: "correo" | "contrasena";
}

export async function iniciarSesion(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  if (!correo.success) {
    return { ok: false, campo: "correo", mensaje: correo.error.issues[0]?.message };
  }
  const contrasena = z.string().min(1, "Escribe tu contraseña.").safeParse(formData.get("contrasena"));
  if (!contrasena.success) {
    return { ok: false, campo: "contrasena", mensaje: contrasena.error.issues[0]?.message };
  }

  const auth = await crearAccionesAuth();
  if (!auth) return { ok: false, mensaje: SIN_BACKEND };

  const { data, error } = await auth.signInWithPassword({ email: correo.data, password: contrasena.data });
  if (error || !data?.user) {
    if (error?.statusCode === 401 || error?.statusCode === 400) {
      return {
        ok: false,
        campo: "contrasena",
        mensaje: "Correo o contraseña incorrectos. Si aún no tienes contraseña, créala desde el enlace de abajo.",
      };
    }
    if (error?.statusCode === 403) {
      return { ok: false, campo: "correo", mensaje: "Tu correo no está verificado. Crea una contraseña nueva para verificarlo." };
    }
    return { ok: false, mensaje: `No pudimos iniciar tu sesión: ${error?.message ?? "error desconocido"}.` };
  }

  // Según el rol: propietario y colaborador → /panel, empresa → /w/[slug]. Una invitación pendiente siempre se respeta. Si pidió una ruta concreta y le corresponde, se respeta.
  const rol = await obtenerRol();
  const inicio = rutaInicio(rol);
  const pedida = rutaSegura(formData.get("siguiente"));
  const permitida =
    ((rol.tipo === "propietario" || rol.tipo === "colaborador") && pedida.startsWith("/panel")) ||
    (rol.tipo === "empresa" && pedida.startsWith(`/w/${rol.slug}`)) ||
    pedida.startsWith("/invitacion/");
  redirect(permitida ? pedida : inicio);
}

export async function cerrarSesion() {
  const auth = await crearAccionesAuth();
  if (auth) {
    await auth.signOut();
  }
  redirect("/login");
}

// ---------------------------------------------------------------------------
// Crear o recuperar contraseña (código de 6 dígitos por correo)
// ---------------------------------------------------------------------------
export interface EstadoRecuperacion {
  paso: "correo" | "codigo" | "contrasena" | "listo";
  correo?: string;
  /** Token obtenido al canjear el código; vence en minutos. */
  token?: string;
  ok: boolean;
  mensaje?: string;
}

/** Paso 1: envía el código de recuperación al correo. */
export async function enviarCodigoRecuperacion(
  _: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  if (!correo.success) {
    return { paso: "correo", ok: false, mensaje: correo.error.issues[0]?.message };
  }

  const insforge = await crearClienteServidor();
  if (!insforge) return { paso: "correo", ok: false, mensaje: SIN_BACKEND };

  const { error } = await insforge.auth.sendResetPasswordEmail({ email: correo.data });
  if (error) {
    // Un código reciente sigue vigente: en vez de un error, se pasa a escribirlo.
    const espera = segundosDeEspera(error);
    if (espera !== null) {
      return {
        paso: "codigo",
        correo: correo.data,
        ok: true,
        mensaje: `Ya enviamos un código a ${correo.data} hace poco. Revisa tu correo (también spam) y escríbelo aquí; si no llegó, podrás pedir otro en ${espera} segundos.`,
      };
    }
    return { paso: "correo", ok: false, mensaje: `No pudimos enviar el código: ${error.message}.` };
  }

  return {
    paso: "codigo",
    correo: correo.data,
    ok: true,
    mensaje: `Si ${correo.data} tiene una cuenta, recibirá un código de 6 dígitos en unos segundos.`,
  };
}

/** Paso 1 (alternativo): ya tiene un código (por ejemplo, el que le envió el propietario); pasa a escribirlo sin pedir otro. */
export async function usarCodigoRecibido(
  _: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  if (!correo.success) {
    return { paso: "correo", ok: false, mensaje: correo.error.issues[0]?.message };
  }
  return { paso: "codigo", correo: correo.data, ok: true };
}

/** Paso 2: canjea el código por un token temporal. */
export async function verificarCodigoRecuperacion(
  _: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  const codigo = codigoSchema.safeParse(formData.get("codigo"));
  if (!correo.success) return { paso: "correo", ok: false, mensaje: "Vuelve a escribir tu correo." };
  if (!codigo.success) {
    return { paso: "codigo", correo: correo.data, ok: false, mensaje: codigo.error.issues[0]?.message };
  }

  const insforge = await crearClienteServidor();
  if (!insforge) return { paso: "correo", ok: false, mensaje: SIN_BACKEND };

  const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email: correo.data, code: codigo.data });
  if (error || !data?.token) {
    return {
      paso: "codigo",
      correo: correo.data,
      ok: false,
      mensaje: "El código no es válido o ya venció. Pide uno nuevo.",
    };
  }

  return { paso: "contrasena", correo: correo.data, token: data.token, ok: true };
}

/** Paso 3: fija la nueva contraseña con el token. */
export async function establecerContrasena(
  _: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  const token = z.string().min(1).safeParse(formData.get("token"));
  const nueva = contrasenaSchema.safeParse(formData.get("contrasena"));
  const repetida = String(formData.get("contrasena2") ?? "");

  if (!correo.success || !token.success) {
    return { paso: "correo", ok: false, mensaje: "La sesión de recuperación venció. Empieza de nuevo." };
  }
  if (!nueva.success) {
    return { paso: "contrasena", correo: correo.data, token: token.data, ok: false, mensaje: nueva.error.issues[0]?.message };
  }
  if (nueva.data !== repetida) {
    return { paso: "contrasena", correo: correo.data, token: token.data, ok: false, mensaje: "Las contraseñas no coinciden." };
  }

  const insforge = await crearClienteServidor();
  if (!insforge) return { paso: "correo", ok: false, mensaje: SIN_BACKEND };

  const { error } = await insforge.auth.resetPassword({ newPassword: nueva.data, otp: token.data });
  if (error) {
    const vencido = error.statusCode === 400 || error.statusCode === 401;
    return {
      paso: vencido ? "correo" : "contrasena",
      correo: correo.data,
      token: vencido ? undefined : token.data,
      ok: false,
      mensaje: vencido ? "El código venció. Pide uno nuevo." : `No pudimos guardar la contraseña: ${error.message}.`,
    };
  }

  return { paso: "listo", correo: correo.data, ok: true, mensaje: "Contraseña guardada. Ya puedes entrar." };
}
