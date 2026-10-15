import { z } from "zod";

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Formulario de contacto de la landing. `sitio_web` es una trampa para bots: debe llegar vacío. */
export const leadSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe tu nombre.").max(120),
    empresa: opcional(160),
    telefono: z
      .string()
      .trim()
      .max(30)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || v.replace(/\D/g, "").length >= 7, "Escribe un número válido."),
    correo: z
      .string()
      .trim()
      .max(160)
      .transform((v) => (v === "" ? null : v.toLowerCase()))
      .nullable()
      .optional()
      .refine((v) => !v || z.string().email().safeParse(v).success, "Escribe un correo válido."),
    interes: opcional(160),
    mensaje: z.string().trim().min(10, "Cuéntame un poco más (al menos 10 caracteres).").max(2000, "Máximo 2000 caracteres."),
    sitio_web: z.string().max(0).optional(),
  })
  .refine((d) => d.telefono || d.correo, { message: "Déjame un WhatsApp o un correo para responderte.", path: ["telefono"] });

export type LeadInput = z.input<typeof leadSchema>;
export type LeadDatos = z.output<typeof leadSchema>;

/** Mensaje que se guarda: la empresa, si la escribió, va al inicio. */
export function mensajeLead(d: Pick<LeadDatos, "empresa" | "mensaje">): string {
  return d.empresa ? `Empresa: ${d.empresa}\n\n${d.mensaje}` : d.mensaje;
}
