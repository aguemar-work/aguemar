"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clienteAnonimo } from "@/lib/datos/landing";
import { exito, fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { MENSAJES_LEAD, SIN_CANAL, crearLeadSchema, mensajeLead, type LeadInput } from "@/lib/validators/lead";
import type { Idioma } from "@/lib/landing-textos";
import { avisarLead } from "@/lib/correo/avisos";
import { respaldarLead } from "@/lib/correo/respaldo-lead";
import { ipDe } from "@/lib/ip";

/**
 * Formulario de contacto de la landing: guarda el lead con crear_lead (límite de 5 por hora e IP en la base).
 * Si la base falla, el mensaje sale por correo (respaldarLead); si eso tampoco funciona, se responde
 * con campo SIN_CANAL y el formulario ofrece WhatsApp con el mensaje ya escrito.
 */
export async function enviarContacto(input: LeadInput, idioma: Idioma = "es"): Promise<Resultado<void>> {
  const en = idioma === "en";
  const parsed = crearLeadSchema(MENSAJES_LEAD[en ? "en" : "es"]).safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // La trampa para bots se responde como éxito para no darles pistas.
    if (issue?.path[0] === "sitio_web") return exito(undefined);
    return fallo(issue?.message ?? (en ? "Check your details." : "Revisa los datos."), issue?.path.map(String).join("."));
  }
  const d = parsed.data;
  // Quien escribe desde la landing en inglés probablemente espera respuesta en inglés.
  const mensaje = en ? `[Escribió desde la versión en inglés]

${mensajeLead(d)}` : mensajeLead(d);
  const h = await headers();
  const ip = ipDe(h);
  const lead = { nombre: d.nombre, telefono: d.telefono ?? null, correo: d.correo ?? null, mensaje };
  const respaldo = async (motivo: string): Promise<Resultado<void>> =>
    (await respaldarLead(lead, ip, motivo))
      ? exito(undefined)
      : fallo(en ? "I couldn't receive your message right now. Send it to me on WhatsApp, it's already written." : "No pude recibir tu mensaje ahora. Envíamelo por WhatsApp, ya está escrito.", SIN_CANAL);

  const cliente = clienteAnonimo();
  if (!cliente) return respaldo("InsForge sin configurar");
  try {
    const { error } = await cliente.database.rpc("crear_lead", {
      p_nombre: d.nombre,
      p_telefono: d.telefono ?? "",
      p_correo: d.correo ?? "",
      p_servicio: d.interes ?? "",
      p_mensaje: mensaje,
      p_ip: ip,
      p_user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    });
    if (error) {
      const texto = error.message ?? "";
      // Límite de envíos: no se respalda (es el freno contra abusos).
      if (/demasiados/i.test(texto)) {
        return fallo(en ? "I received several messages from your connection. Try again in an hour or message me on WhatsApp." : "Recibí varios mensajes desde tu conexión. Intenta en una hora o escríbeme por WhatsApp.");
      }
      // Datos que la base rechaza: los corrige quien escribe.
      if (/requerido|demasiado largo/i.test(texto)) return fallo(traducirError(error).mensaje);
      return respaldo(`crear_lead: ${texto || "sin detalle"}`);
    }
    revalidatePath("/panel", "layout");
    avisarLead({ nombre: d.nombre, telefono: d.telefono ?? null, correo: d.correo ?? null, interes: d.interes ?? null, mensaje });
    return exito(undefined);
  } catch (e) {
    return respaldo(`excepción: ${e instanceof Error ? e.message : String(e)}`);
  }
}
