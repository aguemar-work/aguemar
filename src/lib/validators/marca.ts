import { z } from "zod";
import { esRucValido } from "./documento";

const texto = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const marcaSchema = z.object({
  nombre_comercial: z.string().trim().min(2, "Escribe el nombre comercial.").max(120),
  responsable: z.string().trim().min(2, "Escribe el nombre del responsable.").max(120),
  cargo: z.string().trim().min(2, "Escribe el cargo.").max(80),
  ruc: texto(20).refine(
    (v) => !v || v.startsWith("[PENDIENTE") || esRucValido(v),
    "El RUC debe tener 11 dígitos válidos.",
  ),
  telefono: texto(40),
  correo: texto(120).refine((v) => !v || v.startsWith("[PENDIENTE") || z.string().email().safeParse(v).success, "Escribe un correo válido."),
  web: texto(200),
  direccion: texto(300),
  /** IGV en porcentaje con hasta 2 decimales, p. ej. 18 o 18.00 */
  igv_porcentaje: z
    .number({ message: "Escribe el IGV en porcentaje." })
    .min(0, "El IGV no puede ser negativo.")
    .max(100, "El IGV no puede superar 100 %."),
  moneda_default: z.enum(["PEN", "USD"]),
  validez_dias_default: z.number({ message: "Escribe los días de validez." }).int().min(1, "Mínimo 1 día.").max(365, "Máximo 365 días."),
  condiciones_default: texto(4000),
  pago_cuenta: texto(120),
  pago_cci: texto(40),
  pago_yape: texto(40),
  pago_plin: texto(40),
});

export type MarcaInput = z.input<typeof marcaSchema>;
export type MarcaDatos = z.output<typeof marcaSchema>;

/** 18 → 1800 (centésimas de punto porcentual, como en la base). */
export function porcentajeABasis(valor: number): number {
  return Math.round(valor * 100);
}
export function basisAPorcentaje(valor: number): number {
  return valor / 100;
}
