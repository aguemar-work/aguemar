import { fechaLima } from "./format";

/** A partir de cuántos días sin entrar una empresa se marca como inactiva (HU 2.1). */
export const DIAS_INACTIVA = 30;

export type EstadoAcceso =
  | { tipo: "sin_acceso" }
  | { tipo: "invitacion"; vencida: boolean }
  | { tipo: "sin_ingresar" }
  | { tipo: "activa"; dias: number }
  | { tipo: "inactiva"; dias: number };

interface DatosAcceso {
  usuarioId: string | null;
  ultimoIngreso: string | null;
  /** Invitación de empresa sin usar ni revocar, si hay. */
  invitacion: { expira_en: string } | null;
}

/** Días civiles (hora de Lima) entre dos instantes. */
function diasEntre(desde: Date | string, hasta: Date): number {
  const a = Date.parse(`${fechaLima(desde)}T00:00:00Z`);
  const b = Date.parse(`${fechaLima(hasta)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Cómo va el acceso de una empresa a su workspace: invitación, nunca entró, activa o inactiva. */
export function estadoAcceso({ usuarioId, ultimoIngreso, invitacion }: DatosAcceso, ahora: Date = new Date()): EstadoAcceso {
  if (!usuarioId) {
    if (invitacion) return { tipo: "invitacion", vencida: Date.parse(invitacion.expira_en) < ahora.getTime() };
    return { tipo: "sin_acceso" };
  }
  if (!ultimoIngreso) return { tipo: "sin_ingresar" };
  const dias = diasEntre(ultimoIngreso, ahora);
  return dias >= DIAS_INACTIVA ? { tipo: "inactiva", dias } : { tipo: "activa", dias };
}

/** Texto y tono de la etiqueta para la lista y la ficha de empresas. */
export function etiquetaAcceso(e: EstadoAcceso): { texto: string; tono: "ok" | "warn" | "danger" | "neutro" } {
  switch (e.tipo) {
    case "sin_acceso":
      return { texto: "Sin acceso", tono: "neutro" };
    case "invitacion":
      return e.vencida ? { texto: "Invitación vencida", tono: "danger" } : { texto: "Invitación pendiente", tono: "warn" };
    case "sin_ingresar":
      return { texto: "Aún no ingresa", tono: "warn" };
    case "activa":
      return { texto: `Activa · ${e.dias === 0 ? "hoy" : e.dias === 1 ? "ayer" : `hace ${e.dias} días`}`, tono: "ok" };
    case "inactiva":
      return { texto: `Sin ingresar hace ${DIAS_INACTIVA}+ días`, tono: "danger" };
  }
}
