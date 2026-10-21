import "@/lib/zod-sin-jit";
import { z } from "zod";
import { TIPOS_SERVICIO_FICHA } from "@/lib/documentos";

export const itemChecklistSchema = z.object({
  titulo: z.string().trim().min(1, "Escribe el título del paso.").max(120),
  detalle: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
});

export const plantillaSchema = z.object({
  tipo_servicio: z.enum(TIPOS_SERVICIO_FICHA, "Elige el tipo de servicio."),
  items: z.array(itemChecklistSchema).min(1, "Agrega al menos un paso.").max(40, "Máximo 40 pasos."),
});

export type PlantillaInput = z.input<typeof plantillaSchema>;
export type PlantillaDatos = z.output<typeof plantillaSchema>;
