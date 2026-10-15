"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clienteAnonimo } from "@/lib/datos/landing";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { leadSchema, mensajeLead, type LeadInput } from "@/lib/validators/lead";

/** IP del visitante según el proxy (Vercel pone la real primero en x-forwarded-for). */
function ipDe(h: Headers): string | null {
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  return /^[\d.:a-fA-F]{3,45}$/.test(ip) ? ip : null;
}

/** Formulario de contacto de la landing: guarda el lead con crear_lead (límite de 5 por hora e IP en la base). */
export async function enviarContacto(input: LeadInput): Promise<Resultado<void>> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // La trampa para bots se responde como éxito para no darles pistas.
    if (issue?.path[0] === "sitio_web") return exito(undefined);
    return fallo(issue?.message ?? "Revisa los datos.", issue?.path.map(String).join("."));
  }
  const cliente = clienteAnonimo();
  if (!cliente) return fallo("El formulario no está disponible ahora. Escríbeme por WhatsApp o correo.");
  const d = parsed.data;
  const h = await headers();
  try {
    const { error } = await cliente.database.rpc("crear_lead", {
      p_nombre: d.nombre,
      p_telefono: d.telefono ?? "",
      p_correo: d.correo ?? "",
      p_servicio: d.interes ?? "",
      p_mensaje: mensajeLead(d),
      p_ip: ipDe(h),
      p_user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    });
    if (error) {
      const t = traducirError(error);
      return fallo(/demasiados/i.test(error.message ?? "") ? "Recibí varios mensajes desde tu conexión. Intenta en una hora o escríbeme por WhatsApp." : t.mensaje);
    }
    revalidatePath("/panel", "layout");
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
