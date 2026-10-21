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

const fecha = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Fecha inválida.");

const idOpcional = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const comun = {
  cliente_id: z.string().uuid("Elige la empresa."),
  trabajo_id: idOpcional,
  area: z.enum(["diseno", "desarrollo", "soporte"], { message: "Elige el área." }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  titulo: z.string().trim().min(3, "Escribe el título.").max(200),
  notas: texto(4000),
};

export const briefSchema = z.object({
  ...comun,
  objetivo: texto(4000),
  contexto: texto(4000),
  publico: texto(2000),
  alcance: texto(4000),
  fuera_alcance: texto(4000),
  entregables: texto(4000),
  referencias: texto(4000),
  fecha_entrega: fecha,
});

export type BriefInput = z.input<typeof briefSchema>;
export type BriefDatos = z.output<typeof briefSchema>;

export const actaSchema = z.object({
  ...comun,
  resumen: texto(2000),
  observaciones: texto(4000),
  entregables: z
    .array(
      z.object({
        nombre: z.string().trim().min(1, "Escribe el entregable.").max(200),
        detalle: texto(1000),
        url: z
          .string()
          .trim()
          .max(500)
          .nullable()
          .optional()
          .transform((v) => (v ? v : null))
          .refine((v) => !v || /^https?:\/\//i.test(v), "El enlace debe empezar con http:// o https://"),
      }),
    )
    .min(1, "Agrega al menos un entregable."),
});

export type ActaInput = z.input<typeof actaSchema>;
export type ActaDatos = z.output<typeof actaSchema>;
