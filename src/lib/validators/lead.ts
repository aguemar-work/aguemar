import { z } from "zod";

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Mensajes de validación del formulario de contacto, por idioma de la landing. */
export interface MensajesLead {
  nombre: string;
  telefono: string;
  correo: string;
  mensajeCorto: string;
  mensajeLargo: string;
  contacto: string;
}

export const MENSAJES_LEAD: Record<"es" | "en", MensajesLead> = {
  es: {
    nombre: "Escribe tu nombre.",
    telefono: "Escribe un número válido.",
    correo: "Escribe un correo válido.",
    mensajeCorto: "Cuéntame un poco más (al menos 10 caracteres).",
    mensajeLargo: "Máximo 2000 caracteres.",
    contacto: "Déjame un WhatsApp o un correo para responderte.",
  },
  en: {
    nombre: "Enter your name.",
    telefono: "Enter a valid number.",
    correo: "Enter a valid email.",
    mensajeCorto: "Tell me a bit more (at least 10 characters).",
    mensajeLargo: "2000 characters maximum.",
    contacto: "Leave me a WhatsApp number or an email so I can reply.",
  },
};

/** Formulario de contacto de la landing. `sitio_web` es una trampa para bots: debe llegar vacío. */
export function crearLeadSchema(m: MensajesLead) {
  return z
    .object({
      nombre: z.string().trim().min(2, m.nombre).max(120),
      empresa: opcional(160),
      telefono: z
        .string()
        .trim()
        .max(30)
        .transform((v) => (v === "" ? null : v))
        .nullable()
        .optional()
        .refine((v) => !v || v.replace(/\D/g, "").length >= 7, m.telefono),
      correo: z
        .string()
        .trim()
        .max(160)
        .transform((v) => (v === "" ? null : v.toLowerCase()))
        .nullable()
        .optional()
        .refine((v) => !v || z.string().email().safeParse(v).success, m.correo),
      interes: opcional(160),
      mensaje: z.string().trim().min(10, m.mensajeCorto).max(2000, m.mensajeLargo),
      sitio_web: z.string().max(0).optional(),
    })
    .refine((d) => d.telefono || d.correo, { message: m.contacto, path: ["telefono"] });
}

export const leadSchema = crearLeadSchema(MENSAJES_LEAD.es);

export type LeadInput = z.input<typeof leadSchema>;
export type LeadDatos = z.output<typeof leadSchema>;

/** Mensaje que se guarda: la empresa, si la escribió, va al inicio. */
export function mensajeLead(d: Pick<LeadDatos, "empresa" | "mensaje">): string {
  return d.empresa ? `Empresa: ${d.empresa}\n\n${d.mensaje}` : d.mensaje;
}
