import { z } from "zod";
import { aCentimos } from "@/lib/format";
import { aCantidad } from "@/lib/cotizacion";

const montoValido = (v: string | undefined) => {
  if (!v) return true;
  try {
    return aCentimos(v) >= 0;
  } catch {
    return false;
  }
};

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const lineaSchema = z.object({
  servicio_id: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  descripcion: z.string().trim().min(1, "Describe la línea.").max(1000, "Máximo 1000 caracteres."),
  unidad: z.string().trim().min(1, "Indica la unidad.").max(40),
  cantidad: z.string().trim().refine((v) => aCantidad(v) > 0, "Cantidad mayor que 0 (hasta 3 decimales)."),
  precio: z.string().trim().min(1, "Escribe el precio.").refine(montoValido, "Precio inválido, p. ej. 1500 o 1500,50."),
  descuento: z.string().trim().optional().refine(montoValido, "Descuento inválido."),
});

export const cotizacionSchema = z.object({
  cliente_id: z.string().uuid("Elige la empresa."),
  area: z.enum(["diseno", "desarrollo", "soporte"], { message: "Elige el área." }),
  asunto: z.string().trim().min(3, "Escribe el asunto, p. ej. Página web corporativa.").max(200),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  validez_dias: z.number({ message: "Escribe los días de validez." }).int().min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
  moneda: z.enum(["PEN", "USD"]),
  igv_modo: z.enum(["sumar", "incluido"]),
  igv_porcentaje: z.number({ message: "Escribe el IGV." }).min(0).max(100),
  condiciones: texto(4000),
  notas: texto(4000),
  items: z.array(lineaSchema).min(1, "Agrega al menos una línea."),
});

export type LineaInput = z.input<typeof lineaSchema>;
export type CotizacionInput = z.input<typeof cotizacionSchema>;
export type CotizacionDatos = z.output<typeof cotizacionSchema>;

/** Línea lista para la base (céntimos y cantidad numérica). */
export function lineaABase(l: z.output<typeof lineaSchema>, orden: number) {
  return {
    servicio_id: l.servicio_id,
    descripcion: l.descripcion,
    unidad: l.unidad,
    cantidad: aCantidad(l.cantidad),
    precio_unitario: aCentimos(l.precio),
    descuento: l.descuento ? aCentimos(l.descuento) : 0,
    orden,
  };
}

export const cobroSchema = z.object({
  cliente_id: z.string().uuid("Elige la empresa."),
  cotizacion_id: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  monto: z.string().trim().min(1, "Escribe el monto.").refine((v) => montoValido(v) && aCentimos(v) > 0, "Monto mayor que 0, p. ej. 750 o 750,50."),
  moneda: z.enum(["PEN", "USD"]),
  medio: z.enum(["transferencia", "yape", "plin", "efectivo", "tarjeta", "otro"]),
  referencia: texto(120),
  notas: texto(1000),
});

export type CobroInput = z.input<typeof cobroSchema>;
export type CobroDatos = z.output<typeof cobroSchema>;

export const aceptacionSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre de quien acepta.").max(120),
  dni: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{8}$/.test(v), "El DNI debe tener 8 dígitos."),
});

/** Plazo de pago y recordatorios de una cotización (se cambian desde su detalle, en cualquier estado). */
export const pagoCotizacionSchema = z
  .object({
    plazo_pago_dias: z.number({ message: "Escribe los días de plazo." }).int("Usa días enteros.").min(0, "Mínimo 0 días (al contado).").max(120, "Máximo 120 días.").optional(),
    recordar_pago: z.boolean().optional(),
  })
  .refine((v) => v.plazo_pago_dias !== undefined || v.recordar_pago !== undefined, "No hay nada que guardar.");

export type PagoCotizacionInput = z.input<typeof pagoCotizacionSchema>;
