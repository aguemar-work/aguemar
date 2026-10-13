"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { crearAccionesAuth } from "@/lib/insforge/server";

const correoSchema = z.string().trim().email("Escribe un correo válido.");
const codigoSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "El código tiene 6 dígitos.");

export interface EstadoLogin {
  paso: "correo" | "codigo";
  correo?: string;
  ok: boolean;
  mensaje?: string;
}

const SIN_BACKEND: EstadoLogin = {
  paso: "correo",
  ok: false,
  mensaje: "InsForge no está configurado. Completa .env.local para iniciar sesión.",
};

/** Paso 1: envía el código de 6 dígitos al correo. */
export async function enviarCodigo(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const parsed = correoSchema.safeParse(formData.get("correo"));
  if (!parsed.success) {
    return { paso: "correo", ok: false, mensaje: parsed.error.issues[0]?.message ?? "Correo inválido." };
  }

  const auth = await crearAccionesAuth();
  if (!auth) return SIN_BACKEND;

  const { error } = await auth.signInWithOtp({ email: parsed.data });
  if (error) {
    return {
      paso: "correo",
      ok: false,
      mensaje: `No pudimos enviar el código: ${error.message}. Revisa el correo e inténtalo de nuevo.`,
    };
  }

  return {
    paso: "codigo",
    correo: parsed.data,
    ok: true,
    mensaje: `Te enviamos un código de 6 dígitos a ${parsed.data}. Vence en 5 minutos.`,
  };
}

/** Paso 2: verifica el código y crea la sesión (cookies). */
export async function verificarCodigo(_: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const correo = correoSchema.safeParse(formData.get("correo"));
  const codigo = codigoSchema.safeParse(formData.get("codigo"));
  if (!correo.success) {
    return { paso: "correo", ok: false, mensaje: "Vuelve a escribir tu correo." };
  }
  if (!codigo.success) {
    return { paso: "codigo", correo: correo.data, ok: false, mensaje: codigo.error.issues[0]?.message };
  }

  const auth = await crearAccionesAuth();
  if (!auth) return SIN_BACKEND;

  const { data, error } = await auth.verifyOtp({ email: correo.data, otp: codigo.data });
  if (error || !data?.user) {
    const vencido = error?.statusCode === 400 || error?.statusCode === 401;
    return {
      paso: "codigo",
      correo: correo.data,
      ok: false,
      mensaje: vencido
        ? "El código no es válido o ya venció. Pide uno nuevo."
        : `No pudimos iniciar tu sesión: ${error?.message ?? "error desconocido"}.`,
    };
  }

  const siguiente = String(formData.get("siguiente") ?? "/panel");
  redirect(siguiente.startsWith("/") && !siguiente.startsWith("//") ? siguiente : "/panel");
}

export async function cerrarSesion() {
  const auth = await crearAccionesAuth();
  if (auth) {
    await auth.signOut();
  }
  redirect("/login");
}
