import { z } from "zod";
import { aCentimos } from "@/lib/format";

const texto = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const fecha = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida.");

export const trabajoSchema = z
  .object({
    area: z.enum(["diseno", "desarrollo", "soporte"], { message: "Elige el área." }),
    cliente_id: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || z.string().uuid().safeParse(v).success, "Cliente inválido."),
    titulo: z.string().trim().min(3, "Escribe un título de al menos 3 caracteres.").max(160),
    descripcion: texto(4000),
    estado: z.enum(["propuesta", "en_curso", "en_revision", "entregado", "cerrado", "cancelado"]),
    prioridad: z.enum(["baja", "media", "alta"]),
    fecha_inicio: fecha,
    fecha_compromiso: fecha,
    /** Monto estimado en texto (soles o dólares), vacío = sin monto. */
    monto_estimado_texto: z
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
      }, "Escribe un monto válido, por ejemplo 1500 o 1500,50."),
    moneda: z.enum(["PEN", "USD"]),
    notas: texto(4000),
  })
  .superRefine((v, ctx) => {
    if (v.fecha_inicio && v.fecha_compromiso && v.fecha_compromiso < v.fecha_inicio) {
      ctx.addIssue({ code: "custom", path: ["fecha_compromiso"], message: "La fecha comprometida no puede ser anterior al inicio." });
    }
  });

export type TrabajoInput = z.input<typeof trabajoSchema>;
export type TrabajoDatos = z.output<typeof trabajoSchema>;

export const etapaSchema = z.object({
  titulo: z.string().trim().min(1, "Escribe el nombre de la etapa.").max(120),
});

export const tareaSchema = z.object({
  titulo: z.string().trim().min(1, "Escribe la tarea.").max(200),
  etapa_id: z.string().uuid().nullable().optional(),
  fecha_limite: fecha,
});

export const entregableSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe el nombre del entregable.").max(160),
  tipo: z.enum(["enlace", "archivo", "acceso", "otro"]),
  url: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "El enlace debe empezar con http:// o https://."),
  nota: texto(500),
});

export type EntregableInput = z.input<typeof entregableSchema>;
export type EntregableDatos = z.output<typeof entregableSchema>;
