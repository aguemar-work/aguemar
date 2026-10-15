import { z } from "zod";
import { MAX_INDICADORES, MAX_SECCIONES } from "@/lib/informe";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const fecha = (mensaje: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, mensaje);

export const informeSchema = z
  .object({
    cliente_id: z.string().uuid("Elige la empresa."),
    trabajo_id: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v ? v : null)),
    area: z.enum(["diseno", "desarrollo", "soporte"], { message: "Elige el área." }),
    fecha: fecha("Fecha inválida."),
    titulo: z.string().trim().min(3, "Escribe el título.").max(200),
    periodo_inicio: fecha("Elige el inicio del periodo."),
    periodo_fin: fecha("Elige el fin del periodo."),
    resumen: texto(2000),
    indicadores: z
      .array(
        z.object({
          valor: z.string().trim().min(1, "Escribe el valor.").max(20, "Máximo 20 caracteres."),
          etiqueta: z.string().trim().min(1, "Escribe qué mide.").max(60),
          nota: texto(120),
        }),
      )
      .max(MAX_INDICADORES, `Hasta ${MAX_INDICADORES} indicadores.`),
    secciones: z
      .array(
        z.object({
          titulo: z.string().trim().min(1, "Escribe el título de la sección.").max(120),
          texto: z.string().trim().max(6000),
        }),
      )
      .max(MAX_SECCIONES, `Hasta ${MAX_SECCIONES} secciones.`),
    notas: texto(4000),
  })
  .refine((d) => d.periodo_fin >= d.periodo_inicio, { message: "El fin del periodo no puede ser antes del inicio.", path: ["periodo_fin"] })
  // Una sección sin texto no aporta: se descarta al guardar.
  .transform((d) => ({ ...d, secciones: d.secciones.filter((s) => s.texto.length > 0) }));

export type InformeInput = z.input<typeof informeSchema>;
export type InformeDatos = z.output<typeof informeSchema>;
