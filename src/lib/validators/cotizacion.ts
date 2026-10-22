import "@/lib/zod-sin-jit";
import { z } from "zod";
import { aCentimos } from "@/lib/format";
import { aCantidad } from "@/lib/cotizacion";
import { esDocumentoValido } from "./documento";

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

/** Valor de `cliente_id` que significa "crear la empresa con los datos de `empresa_nueva`". */
export const NUEVA_EMPRESA = "nueva";

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/** Lo mínimo para crear la empresa desde la cotización; el resto se completa en su ficha. */
export const empresaNuevaSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre o razón social.").max(200),
    tipo_doc: z.enum(["RUC", "DNI"]),
    num_doc: opcional(20),
    contacto: opcional(200),
    telefono: opcional(200),
    correo: opcional(200).refine((v) => !v || z.string().email().safeParse(v).success, "Escribe un correo válido."),
  })
  .superRefine((valor, ctx) => {
    if (valor.num_doc && !esDocumentoValido(valor.tipo_doc, valor.num_doc)) {
      ctx.addIssue({
        code: "custom",
        path: ["num_doc"],
        message: valor.tipo_doc === "RUC" ? "El RUC debe tener 11 dígitos válidos (empieza con 10 o 20)." : "El DNI debe tener 8 dígitos.",
      });
    }
  });

/** Los campos de la empresa nueva tal como llegan del formulario: solo se validan si se eligió crearla. */
const laxo = z.string().nullable().optional();
const empresaNuevaLaxa = z.object({ nombre: laxo, tipo_doc: laxo, num_doc: laxo, contacto: laxo, telefono: laxo, correo: laxo });

export const cotizacionSchema = z
  .object({
    cliente_id: z.string().min(1, "Elige la empresa."),
    /** Solo cuenta (y solo se valida) si `cliente_id` es `NUEVA_EMPRESA`; el formulario siempre manda los campos. */
    empresa_nueva: empresaNuevaLaxa.optional(),
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
  })
  .superRefine((valor, ctx) => {
    if (valor.cliente_id === NUEVA_EMPRESA) {
      const r = empresaNuevaSchema.safeParse(valor.empresa_nueva ?? {});
      if (!r.success) for (const i of r.error.issues) ctx.addIssue({ code: "custom", path: ["empresa_nueva", ...i.path], message: i.message });
    } else if (!z.string().uuid().safeParse(valor.cliente_id).success) {
      ctx.addIssue({ code: "custom", path: ["cliente_id"], message: "Elige la empresa." });
    }
  })
  // Con una empresa existente, los campos de la nueva se descartan; con NUEVA_EMPRESA salen ya limpios.
  .transform((v) => ({ ...v, empresa_nueva: v.cliente_id === NUEVA_EMPRESA ? empresaNuevaSchema.parse(v.empresa_nueva ?? {}) : undefined }));

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
