import { z } from "zod";
import { CLAVES_MODULO } from "@/lib/modulos";
import { SLUG_REGEX } from "@/lib/slug";

export const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_REGEX, "Solo minúsculas, números y guiones; sin empezar ni terminar con guion.");

export const modulosSchema = z.array(z.enum(CLAVES_MODULO)).max(CLAVES_MODULO.length);

export const accesoEmpresaSchema = z.object({
  correo: z.string().trim().email("Escribe un correo válido."),
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
});

export const nuevaContrasenaSchema = z.object({
  contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
});

export type AccesoEmpresaInput = z.input<typeof accesoEmpresaSchema>;
export type NuevaContrasenaInput = z.input<typeof nuevaContrasenaSchema>;
