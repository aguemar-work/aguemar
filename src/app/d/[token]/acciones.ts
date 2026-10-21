"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/insforge/server";
import { exito, fallo, type Resultado, falloDe } from "@/lib/datos/resultado";
import { avisarAceptacion } from "@/lib/correo/avisos";
import { ipDe } from "@/lib/ip";

const aceptacionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre completo.").max(120),
  dni: z.string().trim().regex(/^\d{8}$/, "El DNI debe tener 8 dígitos."),
});

/** Aceptación desde el portal público: aceptar_cotizacion valida el token y la vigencia, y crea el trabajo. */
export async function aceptarCotizacionPortal(token: string, input: { nombre: string; dni: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("El servicio no está disponible. Inténtalo más tarde.");
  const h = await headers();
  const { data, error } = await insforge.database.rpc("aceptar_cotizacion", {
    p_token: token,
    p_nombre: parsed.data.nombre,
    p_dni: parsed.data.dni,
    p_ip: ipDe(h),
    p_user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) return falloDe(error, "portal.aceptarCotizacionPortal");
  revalidatePath(`/d/${token}`);
  revalidatePath("/panel", "layout");
  const r = data as { ya_aceptada?: boolean; numero?: string } | null;
  if (!r?.ya_aceptada) avisarAceptacion({ tipo: "cotizacion", numero: r?.numero ?? null, nombre: parsed.data.nombre, via: "enlace" });
  return exito(undefined);
}

/** Aceptación de un acta desde el portal público. */
export async function aceptarActaPortal(token: string, input: { nombre: string; dni: string }): Promise<Resultado<void>> {
  const parsed = aceptacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path[0]?.toString());
  }
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("El servicio no está disponible. Inténtalo más tarde.");
  const { data, error } = await insforge.database.rpc("aceptar_acta", { p_token: token, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni });
  if (error) return falloDe(error, "portal.aceptarActaPortal");
  revalidatePath(`/d/${token}`);
  revalidatePath("/panel", "layout");
  const r = data as { ya_aceptada?: boolean; numero?: string } | null;
  if (!r?.ya_aceptada) avisarAceptacion({ tipo: "acta", numero: r?.numero ?? null, nombre: parsed.data.nombre, via: "enlace" });
  return exito(undefined);
}
