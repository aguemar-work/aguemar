import { z } from "zod";
import { esDocumentoValido } from "./documento";

const opcional = z
  .string()
  .trim()
  .max(200)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const clienteSchema = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre o razón social.").max(200),
    tipo_doc: z.enum(["RUC", "DNI"]),
    num_doc: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    contacto: opcional,
    telefono: opcional,
    correo: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine((v) => !v || z.string().email().safeParse(v).success, "Escribe un correo válido."),
    direccion: z.string().trim().max(500).transform((v) => (v === "" ? null : v)).nullable().optional(),
    notas: z.string().trim().max(2000).transform((v) => (v === "" ? null : v)).nullable().optional(),
  })
  .superRefine((valor, ctx) => {
    if (valor.num_doc && !esDocumentoValido(valor.tipo_doc, valor.num_doc)) {
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

export type ClienteInput = z.input<typeof clienteSchema>;
export type ClienteDatos = z.output<typeof clienteSchema>;
