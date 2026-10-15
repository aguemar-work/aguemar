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

/** "__nuevo" en equipo_id = crear el equipo con los datos de equipo_datos. */
export const EQUIPO_NUEVO = "__nuevo";

export const equipoDatosSchema = z.object({
  marca: texto(120),
  modelo: texto(160),
  serie: texto(100),
  sistema_operativo: texto(200),
  procesador: texto(200),
  ram: texto(100),
  almacenamiento: texto(300),
  grafica: texto(200),
  bateria: texto(200),
  bios: texto(200),
});

export const fichaSchema = z
  .object({
    cliente_id: z.string().uuid("Elige la empresa."),
    equipo_id: z.string().optional(),
    /** Datos del equipo nuevo, o los del diagnóstico para actualizar el equipo elegido. */
    equipo_datos: equipoDatosSchema,
    actualizar_equipo: z.boolean().optional(),
    trabajo_id: idOpcional,
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
    tipo_servicio: z.string().trim().min(2, "Escribe el tipo de servicio.").max(120),
    modalidad: z.enum(["remota", "presencial"]),
    titular: z.string().trim().min(3, "Escribe el titular de la portada.").max(200),
    resumen: texto(2000),
    estado_final: z.enum(["operativo", "operativo_observaciones", "requiere_reparacion"]),
    indicadores: z
      .array(z.object({ valor: z.string().trim().min(1, "Valor").max(20), etiqueta: z.string().trim().min(1, "Etiqueta").max(60) }))
      .max(4, "Máximo 4 indicadores."),
    diagnosticos: z.array(
      z.object({
        elemento: z.string().trim().min(1, "Escribe el elemento.").max(120),
        resultado: z.string().trim().max(300),
        estado: z.enum(["optimo", "mejorable", "atendido", "critico"]),
      }),
    ),
    trabajos: z.array(z.object({ titulo: z.string().trim().min(1, "Escribe el trabajo.").max(120), detalle: texto(500), hecho: z.boolean() })),
    incidencias: z.array(
      z.object({
        titulo: z.string().trim().min(1, "Escribe la incidencia.").max(200),
        causa: texto(1000),
        solucion: texto(1000),
        estado: z.enum(["resuelta", "pendiente", "observacion"]),
      }),
    ),
    recomendaciones: z.array(z.object({ texto: z.string().trim().min(1, "Escribe la recomendación.").max(500) })),
    proximo_mantenimiento: fecha,
    diagnostico_origen: z.unknown().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.equipo_id === EQUIPO_NUEVO && !v.equipo_datos.serie) {
      ctx.addIssue({ code: "custom", path: ["equipo_datos", "serie"], message: "El equipo nuevo necesita su número de serie." });
    }
  });

export type FichaInput = z.input<typeof fichaSchema>;
export type FichaDatos = z.output<typeof fichaSchema>;
