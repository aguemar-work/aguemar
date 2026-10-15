"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { crearClienteServidor } from "@/lib/insforge/server";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";

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
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const { error } = await insforge.database.rpc("aceptar_cotizacion", {
    p_token: token,
    p_nombre: parsed.data.nombre,
    p_dni: parsed.data.dni,
    p_ip: ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null,
    p_user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) return fallo(traducirError(error).mensaje);
  revalidatePath(`/d/${token}`);
  revalidatePath("/panel", "layout");
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
  const { error } = await insforge.database.rpc("aceptar_acta", { p_token: token, p_nombre: parsed.data.nombre, p_dni: parsed.data.dni });
  if (error) return fallo(traducirError(error).mensaje);
  revalidatePath(`/d/${token}`);
  revalidatePath("/panel", "layout");
  return exito(undefined);
}
