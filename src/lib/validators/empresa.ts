import { z } from "zod";
import { CLAVES_MODULO } from "@/lib/modulos";
import { SLUG_REGEX } from "@/lib/slug";

export const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_REGEX, "Solo minúsculas, números y guiones; sin empezar ni terminar con guion.");

export const modulosSchema = z.array(z.enum(CLAVES_MODULO)).max(CLAVES_MODULO.length);

const correo = z.string().trim().toLowerCase().email("Escribe un correo válido.").max(160);

/** Invitar a una empresa a su workspace: solo el correo; la persona fija su contraseña. */
export const invitarEmpresaSchema = z.object({ correo });

/** Invitar a un colaborador del equipo y asignarle empresas. */
export const invitarColaboradorSchema = z.object({
  nombre: z.string().trim().min(2, "Escribe su nombre.").max(120),
  correo,
  empresas: z.array(z.string().uuid()).min(1, "Asígnale al menos una empresa.").max(200),
});

/** Cambiar las empresas de un colaborador o desactivarlo. */
export const actualizarColaboradorSchema = z.object({
  activo: z.boolean(),
  empresas: z.array(z.string().uuid()).max(200),
});

/** Aceptar una invitación creando la cuenta. */
export const aceptarInvitacionSchema = z
  .object({
    contrasena: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
    contrasena2: z.string(),
  })
  .refine((d) => d.contrasena === d.contrasena2, { message: "Las contraseñas no coinciden.", path: ["contrasena2"] });

export type InvitarEmpresaInput = z.input<typeof invitarEmpresaSchema>;
export type InvitarColaboradorInput = z.input<typeof invitarColaboradorSchema>;
export type ActualizarColaboradorInput = z.input<typeof actualizarColaboradorSchema>;
export type AceptarInvitacionInput = z.input<typeof aceptarInvitacionSchema>;
