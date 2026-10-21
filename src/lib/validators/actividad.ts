import "@/lib/zod-sin-jit";
import { z } from "zod";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const hora = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^\d{2}:\d{2}$/.test(v), "Hora inválida.");

const idOpcional = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const actividadSchema = z
  .object({
    cliente_id: idOpcional,
    trabajo_id: idOpcional,
    titulo: z.string().trim().min(2, "Escribe el título.").max(200),
    descripcion: texto(2000),
    tipo: z.enum(["trabajo", "reunion", "publicacion", "mantenimiento", "entrega", "otro"]),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
    hora_inicio: hora,
    hora_fin: hora,
    lugar: texto(300),
    estado: z.enum(["planificada", "hecha", "cancelada"]),
    visible_empresa: z.boolean(),
    notas: texto(2000),
  })
  .refine((v) => !v.hora_inicio || !v.hora_fin || v.hora_fin >= v.hora_inicio, { message: "La hora de fin debe ser posterior al inicio.", path: ["hora_fin"] });

export type ActividadInput = z.input<typeof actividadSchema>;
export type ActividadDatos = z.output<typeof actividadSchema>;

/** Lo que envía la empresa desde su workspace. */
export const solicitudSchema = z.object({
  titulo: z.string().trim().min(3, "Cuéntanos en pocas palabras qué necesitas.").max(200),
  descripcion: z.string().trim().max(4000).optional(),
  area: z.enum(["", "diseno", "desarrollo", "soporte"]).optional(),
  prioridad: z.enum(["baja", "media", "alta"]),
  fecha_deseada: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida."),
});

export type SolicitudInput = z.input<typeof solicitudSchema>;
