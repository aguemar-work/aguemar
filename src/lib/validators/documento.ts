import { z } from "zod";

export type TipoDocumento = "RUC" | "DNI";

/** DNI peruano: exactamente 8 dígitos. */
export function esDniValido(valor: string): boolean {
  return /^\d{8}$/.test(valor);
}

/**
 * RUC peruano: 11 dígitos. Empieza en 10, 15, 16, 17 o 20 y el último dígito
 * es un verificador calculado con módulo 11.
 */
export function esRucValido(valor: string): boolean {
  if (!/^\d{11}$/.test(valor)) return false;
  if (!/^(10|15|16|17|20)/.test(valor)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(valor[i]), 0);
  const resto = suma % 11;
  const verificador = (11 - resto) % 10;
  return verificador === Number(valor[10]);
}

export function esDocumentoValido(tipo: TipoDocumento, valor: string): boolean {
  return tipo === "RUC" ? esRucValido(valor) : esDniValido(valor);
}

export const tipoDocumentoSchema = z.enum(["RUC", "DNI"]);

/** Esquema compuesto para formularios: valida el número según el tipo. */
export const documentoSchema = z
  .object({
    tipo_doc: tipoDocumentoSchema,
    num_doc: z.string().trim(),
  })
  .superRefine((valor, ctx) => {
    if (!esDocumentoValido(valor.tipo_doc, valor.num_doc)) {
      ctx.addIssue({
        code: "custom",
        path: ["num_doc"],
        message:
          valor.tipo_doc === "RUC"
            ? "El RUC debe tener 11 dígitos válidos (empieza con 10 o 20)."
            : "El DNI debe tener 8 dígitos.",
      });
    }
  });
