import { createHash, timingSafeEqual } from "node:crypto";
import { envServidor } from "@/lib/env";
import { enviarRecordatoriosPago } from "@/lib/correo/recordatorio-pago";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Compara sin filtrar por tiempo cuántos caracteres coinciden. */
function mismoSecreto(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

/**
 * Tarea diaria de recordatorios de pago (Vercel Cron, ver vercel.json). Vercel envía
 * `Authorization: Bearer <CRON_SECRET>`; el mismo secreto se pasa a la base, que
 * compara su hash antes de entregar nada.
 */
export async function GET(request: Request) {
  const { CRON_SECRET } = envServidor();
  if (!CRON_SECRET) return Response.json({ error: "Falta CRON_SECRET" }, { status: 503 });
  const recibido = request.headers.get("authorization") ?? "";
  if (!mismoSecreto(recibido, `Bearer ${CRON_SECRET}`)) return Response.json({ error: "No autorizado" }, { status: 401 });

  try {
    const r = await enviarRecordatoriosPago(CRON_SECRET);
    console.info("[recordatorios]", JSON.stringify(r));
    return Response.json(r);
  } catch (e) {
    console.error("[recordatorios] Falló la tarea:", e);
    return Response.json({ error: "Falló la tarea" }, { status: 500 });
  }
}
