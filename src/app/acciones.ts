"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { clienteAnonimo } from "@/lib/datos/landing";
import { exito, fallo, type Resultado, falloDe } from "@/lib/datos/resultado";
import { MENSAJES_LEAD, SIN_CANAL, crearLeadSchema, mensajeLead, origenLeadSchema, type LeadInput } from "@/lib/validators/lead";
import type { Idioma } from "@/lib/landing-textos";
import { avisarLead } from "@/lib/correo/avisos";
import { respaldarLead } from "@/lib/correo/respaldo-lead";
import { ipDe } from "@/lib/ip";
import { clasificarOrigen, type Origen } from "@/lib/origen";
import { after } from "next/server";
import * as Sentry from "@sentry/nextjs";

/** Suma uno al contador del día (eventos_landing). Nunca rompe ni retrasa el envío. */
async function contarEvento(evento: "contacto_enviado", origen: Origen) {
  try {
    const { error } = (await clienteAnonimo()?.database.rpc("registrar_evento", { p_evento: evento, p_origen: origen })) ?? { error: null };
    if (error) console.error("[evento] registrar_evento falló:", error.message);
  } catch (e) {
    console.error("[evento] registrar_evento falló:", e);
  }
}

/**
 * Formulario de contacto de la landing: guarda el lead con crear_lead (límite de 5 por hora e IP en la base).
 * Si la base falla, el mensaje sale por correo (respaldarLead); si eso tampoco funciona, se responde
 * con campo SIN_CANAL y el formulario ofrece WhatsApp con el mensaje ya escrito.
 */
export async function enviarContacto(input: LeadInput, idioma: Idioma = "es", origenEntrada?: unknown): Promise<Resultado<void>> {
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
  const datosOrigen = origenLeadSchema.safeParse(origenEntrada ?? {});
  const origen = datosOrigen.success ? { ...datosOrigen.data, origen: clasificarOrigen(datosOrigen.data) } : null;
  const contarEnvio = () => {
    try {
      after(() => contarEvento("contacto_enviado", origen?.origen ?? "directo"));
    } catch {
      // Fuera de una petición (tests) no hay nada que contar.
    }
  };
  const respaldo = async (motivo: string): Promise<Resultado<void>> => {
    // La base no guardó el lead: que llegue también como alerta (sin los datos de la persona).
    Sentry.captureMessage(`Lead por respaldo: ${motivo}`, "warning");
    if (!(await respaldarLead(lead, ip, motivo))) {
      return fallo(en ? "I couldn't receive your message right now. Send it to me on WhatsApp, it's already written." : "No pude recibir tu mensaje ahora. Envíamelo por WhatsApp, ya está escrito.", SIN_CANAL);
    }
    contarEnvio();
    return exito(undefined);
  };

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
      p_origen: origen,
    });
    if (error) {
      const texto = error.message ?? "";
      const tope = (error as { hint?: string | null }).hint;
      // Tope global de la base: no es culpa de esta persona. El mensaje no se pierde: sale por el respaldo.
      if (tope === "tope_global") return respaldo("tope global de leads");
      // Límite de envíos de esta conexión: no se respalda (es el freno contra abusos).
      if (tope === "tope_ip" || /demasiados/i.test(texto)) {
        return fallo(en ? "I received several messages from your connection. Try again in an hour or message me on WhatsApp." : "Recibí varios mensajes desde tu conexión. Intenta en una hora o escríbeme por WhatsApp.");
      }
      // Datos que la base rechaza: los corrige quien escribe.
      if (/requerido|demasiado largo/i.test(texto)) return falloDe(error, "landing.enviarContacto");
      return respaldo(`crear_lead: ${texto || "sin detalle"}`);
    }
    revalidatePath("/panel", "layout");
    contarEnvio();
    avisarLead({ nombre: d.nombre, telefono: d.telefono ?? null, correo: d.correo ?? null, interes: d.interes ?? null, mensaje });
    return exito(undefined);
  } catch (e) {
    return respaldo(`excepción: ${e instanceof Error ? e.message : String(e)}`);
  }
}
