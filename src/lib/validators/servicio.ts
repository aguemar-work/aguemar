import { z } from "zod";
import { aCentimos } from "@/lib/format";

export const servicioSchema = z.object({
  area: z.enum(["diseno", "desarrollo", "soporte"], { message: "Elige el área." }),
  nombre: z.string().trim().min(2, "Escribe el nombre del servicio.").max(150),
  descripcion: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  /** Precio "desde" en soles como texto (p. ej. "80" o "120,50"); vacío = sin precio. */
  precio_base_texto: z
    .string()
    .trim()
    .optional()
    .refine((v) => {
      if (!v) return true;
      try {
        return aCentimos(v) >= 0;
      } catch {
        return false;
      }
    }, "Escribe un monto válido, por ejemplo 120,50."),
  unidad: z.string().trim().min(1, "Indica la unidad (equipo, hora, servicio…).").max(40),
  visible_landing: z.boolean(),
});

export type ServicioInput = z.input<typeof servicioSchema>;
export type ServicioDatos = z.output<typeof servicioSchema>;

/** Convierte el texto de precio a céntimos (null si está vacío). */
export function precioACentimos(texto: string | undefined): number | null {
  if (!texto || texto.trim() === "") return null;
  return aCentimos(texto);
}
