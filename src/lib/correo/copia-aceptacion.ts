import { textoAceptacion, type OrigenAceptacion } from "@/lib/cotizacion";
import type { Envio } from "./enviar";

export interface DatosCopiaAceptacion {
  /** "Hola Ana," o "Hola,". */
  saludo: string;
  numero: string | null;
  asunto: string;
  nombre: string;
  por: OrigenAceptacion;
  /** dd/mm/aaaa HH:mm */
  fecha: string;
  /** "v1 · 3fa91c0b" (versión y primeros 8 de la huella de lo aceptado). */
  version: string | null;
  /** A su espacio o al portal, donde se ve y se baja el PDF de lo aceptado. */
  url: string;
}

/**
 * Correo de constancia a la empresa cuando se registra la aceptación de una cotización (D5): dice
 * quién aceptó y cómo, y lleva el código de versión que también imprime el PDF, para que pueda
 * cotejar lo que tiene en el teléfono con lo aceptado.
 */
export function armarCopiaAceptacion(d: DatosCopiaAceptacion): Omit<Envio, "para" | "pie" | "responderA"> {
  const numero = d.numero ?? "la cotización";
  return {
    asunto: `Constancia de aceptación ${d.numero ?? ""}: ${d.asunto}`.replace(/\s+:/, ":"),
    rotulo: "// cotización aceptada",
    titulo: d.asunto,
    parrafos: [
      d.saludo,
      `Registramos la aceptación de ${numero}.`,
      textoAceptacion({ nombre: d.nombre, por: d.por }, d.fecha) + ".",
      d.version ? `Versión aceptada: ${d.version}. El PDF lleva el mismo código, para que puedas cotejarlo con el que tienes.` : "El PDF de lo aceptado está disponible en el enlace.",
      "Guarda este correo como constancia.",
    ],
    boton: { texto: "Ver la cotización aceptada", url: d.url },
  };
}
