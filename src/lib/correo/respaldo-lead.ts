/**
 * Respaldo del formulario de contacto: si la base no guarda el lead, el mensaje te llega
 * igual por correo (a AVISOS_PARA, que no depende de la base). Se envía en el acto (no
 * con `after()`) porque de su resultado depende lo que ve quien escribe.
 *
 * Sin base tampoco hay límite por IP, así que aquí va uno en memoria: 3 por hora e IP por
 * instancia. Es un freno simple contra abusos mientras la base está caída, no un límite exacto.
 */
import { envServidor } from "@/lib/env";
import { enviarCorreo } from "./enviar";

const VENTANA_MS = 60 * 60 * 1000;
const MAXIMO = 3;
const envios = new Map<string, number[]>();

/** true si esa IP aún puede usar el respaldo; registra el intento. */
export function respaldoPermitido(ip: string | null, ahora = Date.now()): boolean {
  const clave = ip ?? "sin-ip";
  const recientes = (envios.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= MAXIMO) {
    envios.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  envios.set(clave, recientes);
  // Que el mapa no crezca sin fin si llegan muchas IP distintas.
  if (envios.size > 1000) {
    for (const [k, v] of envios) if (!v.some((t) => ahora - t < VENTANA_MS)) envios.delete(k);
  }
  return true;
}

/** Solo para tests. */
export function reiniciarRespaldo() {
  envios.clear();
}

export interface LeadRespaldo {
  nombre: string;
  telefono: string | null;
  correo: string | null;
  mensaje: string;
}

/** Envía el lead por correo. true si salió; false si no hay a dónde, se pasó el tope o Resend falló. */
export async function respaldarLead(l: LeadRespaldo, ip: string | null, motivo: string): Promise<boolean> {
  const { AVISOS_PARA } = envServidor();
  if (!AVISOS_PARA) {
    console.error(`[lead] No se guardó (${motivo}) y no hay AVISOS_PARA para el respaldo.`);
    return false;
  }
  if (!respaldoPermitido(ip)) {
    console.error(`[lead] No se guardó (${motivo}) y la IP superó el tope del respaldo.`);
    return false;
  }
  const r = await enviarCorreo({
    para: AVISOS_PARA,
    asunto: `Nuevo mensaje desde la web (no quedó en Leads): ${l.nombre}`,
    rotulo: "// lead sin guardar",
    titulo: `${l.nombre} te escribió desde la web`,
    parrafos: [
      "La base no respondió y este mensaje no quedó en Leads: respóndele desde aquí.",
      [l.telefono ? `WhatsApp: ${l.telefono}` : null, l.correo ? `Correo: ${l.correo}` : null].filter(Boolean).join("\n"),
    ].filter(Boolean),
    cita: l.mensaje,
    pie: `Respaldo automático de aguemar Studio. Motivo: ${motivo}.`,
    responderA: l.correo,
  });
  console.error(`[lead] No se guardó (${motivo}); respaldo por correo ${r.ok ? "enviado" : "fallido"}.`);
  return r.ok;
}
