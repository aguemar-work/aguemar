"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/supabase/server";
import { envPublico } from "@/lib/env";

const correoSchema = z.string().trim().email("Escribe un correo válido.");

export interface ResultadoEnlace {
  ok: boolean;
  mensaje: string;
}

/** Envía el enlace mágico de acceso al correo indicado. */
export async function enviarEnlaceMagico(_: ResultadoEnlace | null, formData: FormData): Promise<ResultadoEnlace> {
  const parsed = correoSchema.safeParse(formData.get("correo"));
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message ?? "Correo inválido." };
  }

  const supabase = await crearClienteServidor();
  if (!supabase) {
    return {
      ok: false,
      mensaje: "Supabase no está configurado. Completa .env.local para iniciar sesión.",
    };
  }

  const siguiente = String(formData.get("siguiente") ?? "/panel");
  const destino = new URL("/auth/callback", envPublico.NEXT_PUBLIC_SITE_URL);
  destino.searchParams.set("siguiente", siguiente.startsWith("/") ? siguiente : "/panel");

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: destino.toString() },
  });

  if (error) {
    return {
      ok: false,
      mensaje: `No pudimos enviar el enlace: ${error.message}. Revisa el correo e inténtalo de nuevo.`,
    };
  }

  return { ok: true, mensaje: `Te enviamos un enlace a ${parsed.data}. Ábrelo desde este dispositivo para entrar.` };
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/login");
}
