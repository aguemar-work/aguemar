"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clienteAnonimo } from "@/lib/datos/landing";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { MENSAJES_LEAD, crearLeadSchema, mensajeLead, type LeadInput } from "@/lib/validators/lead";
import type { Idioma } from "@/lib/landing-textos";
import { avisarLead } from "@/lib/correo/avisos";
import { ipDe } from "@/lib/ip";

/** Formulario de contacto de la landing: guarda el lead con crear_lead (límite de 5 por hora e IP en la base). */
export async function enviarContacto(input: LeadInput, idioma: Idioma = "es"): Promise<Resultado<void>> {
  const en = idioma === "en";
  const parsed = crearLeadSchema(MENSAJES_LEAD[en ? "en" : "es"]).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // La trampa para bots se responde como éxito para no darles pistas.
    if (issue?.path[0] === "sitio_web") return exito(undefined);
    return fallo(issue?.message ?? (en ? "Check your details." : "Revisa los datos."), issue?.path.map(String).join("."));
  }
  const cliente = clienteAnonimo();
  if (!cliente) return fallo(en ? "The form isn't available right now. Message me on WhatsApp or by email." : "El formulario no está disponible ahora. Escríbeme por WhatsApp o correo.");
  const d = parsed.data;
  // Quien escribe desde la landing en inglés probablemente espera respuesta en inglés.
  const mensaje = en ? `[Escribió desde la versión en inglés]

${mensajeLead(d)}` : mensajeLead(d);
  const h = await headers();
  try {
    const { error } = await cliente.database.rpc("crear_lead", {
      p_nombre: d.nombre,
      p_telefono: d.telefono ?? "",
      p_correo: d.correo ?? "",
      p_servicio: d.interes ?? "",
      p_mensaje: mensaje,
      p_ip: ipDe(h),
      p_user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    });
    if (error) {
      const t = traducirError(error);
      return fallo(/demasiados/i.test(error.message ?? "") ? (en ? "I received several messages from your connection. Try again in an hour or message me on WhatsApp." : "Recibí varios mensajes desde tu conexión. Intenta en una hora o escríbeme por WhatsApp.") : t.mensaje);
    }
    revalidatePath("/panel", "layout");
    avisarLead({ nombre: d.nombre, telefono: d.telefono ?? null, correo: d.correo ?? null, interes: d.interes ?? null, mensaje });
    return exito(undefined);
  } catch (e) {
    return fallo(traducirError(e).mensaje);
  }
}
