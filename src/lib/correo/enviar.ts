import { envServidor } from "@/lib/env";
import { correoHtml, correoTexto, type DatosCorreo } from "./plantilla";

export interface Envio extends DatosCorreo {
  para: string;
  asunto: string;
  /** A quién se responde si el destinatario contesta el correo. */
  responderA?: string | null;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Envía un correo con Resend (API REST, sin dependencias). Sin RESEND_API_KEY no hace nada:
 * los avisos son un extra y nunca deben romper la acción que los dispara.
 */
export async function enviarCorreo(e: Envio): Promise<{ ok: boolean; omitido?: string }> {
  const { RESEND_API_KEY, RESEND_FROM } = envServidor();
  if (!RESEND_API_KEY) return { ok: false, omitido: "sin RESEND_API_KEY" };
  if (!CORREO.test(e.para)) return { ok: false, omitido: "destinatario inválido" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM ?? "agueMar <onboarding@resend.dev>",
        to: [e.para],
        subject: e.asunto,
        html: correoHtml(e),
        text: correoTexto(e),
        ...(e.responderA && CORREO.test(e.responderA) ? { reply_to: e.responderA } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) {
      console.error(`[correo] Resend respondió ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[correo] No se pudo enviar:", err);
    return { ok: false };
  }
}
