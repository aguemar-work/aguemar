"use server";

import { redirect } from "next/navigation";
import { createClient } from "@insforge/sdk";
import { crearAccionesAuth, crearClienteServidor } from "@/lib/insforge/server";
import { clienteAnonimo } from "@/lib/datos/landing";
import { crearUsuarioInsforge } from "@/lib/insforge/admin";
import { envPublico } from "@/lib/env";
import { fallo, type Resultado } from "@/lib/datos/resultado";
import { traducirError } from "@/lib/insforge/errores";
import { TOKEN_INVITACION } from "@/lib/invitaciones";
import { aceptarInvitacionSchema, type AceptarInvitacionInput } from "@/lib/validators/empresa";

export interface VistaInvitacion {
  tipo: "empresa" | "colaborador";
  correo: string;
  nombre: string | null;
  empresa: string | null;
  estudio: string | null;
  estado: "vigente" | "usada" | "vencida" | "revocada";
}

/** Lo que muestra la página antes de aceptar (invitacion_ver, sin datos sensibles). */
export async function verInvitacion(token: string): Promise<VistaInvitacion | null> {
  if (!TOKEN_INVITACION.test(token)) return null;
  const cliente = clienteAnonimo();
  if (!cliente) return null;
  const { data } = await cliente.database.rpc("invitacion_ver", { p_token: token });
  return (data as VistaInvitacion | null) ?? null;
}

function destino(r: { tipo?: string; slug?: string | null } | null): string {
  return r?.tipo === "empresa" && r.slug ? `/w/${r.slug}` : "/panel";
}

/**
 * Sin sesión: crea la cuenta con el correo de la invitación (no el que escriba la
 * persona), inicia sesión y acepta. Si el correo ya tiene cuenta, pide entrar.
 */
export async function crearCuentaYAceptar(token: string, input: AceptarInvitacionInput): Promise<Resultado<void>> {
  const parsed = aceptarInvitacionSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fallo(issue?.message ?? "Revisa la contraseña.", issue?.path[0]?.toString());
  }
  const inv = await verInvitacion(token);
  if (!inv) return fallo("Esta invitación no existe.");
  if (inv.estado !== "vigente") return fallo("Esta invitación ya no está vigente. Pide un enlace nuevo.");

  const alta = await crearUsuarioInsforge(inv.correo, parsed.data.contrasena, inv.nombre ?? inv.empresa ?? undefined);
  if (!alta.id) {
    return fallo(
      /ya tiene un usuario/i.test(alta.error ?? "")
        ? "Ese correo ya tiene una cuenta. Entra con tu contraseña y vuelve a este enlace para aceptar."
        : (alta.error ?? "No pudimos crear tu cuenta."),
    );
  }

  // Acepta con una sesión propia (el cliente del servidor de esta petición aún no tiene la cookie nueva).
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL!;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY!;
  const sesion = createClient({ baseUrl, anonKey, isServerMode: true });
  const entrada = await sesion.auth.signInWithPassword({ email: inv.correo, password: parsed.data.contrasena });
  if (entrada.error) return fallo("Tu cuenta se creó, pero no pudimos iniciar sesión. Entra desde /login.");
  const aceptada = await sesion.database.rpc("invitacion_aceptar", { p_token: token });
  if (aceptada.error) return fallo(traducirError(aceptada.error).mensaje);

  // Y deja la sesión abierta en el navegador.
  const auth = await crearAccionesAuth();
  await auth?.signInWithPassword({ email: inv.correo, password: parsed.data.contrasena });
  redirect(destino(aceptada.data as { tipo?: string; slug?: string | null } | null));
}

/** Con sesión del mismo correo: solo acepta. */
export async function aceptarConSesion(token: string): Promise<Resultado<void>> {
  if (!TOKEN_INVITACION.test(token)) return fallo("Esta invitación no existe.");
  const insforge = await crearClienteServidor();
  if (!insforge) return fallo("El servicio no está disponible.");
  const { data, error } = await insforge.database.rpc("invitacion_aceptar", { p_token: token });
  if (error) return fallo(traducirError(error).mensaje);
  redirect(destino(data as { tipo?: string; slug?: string | null } | null));
}

/** Con sesión de otro correo: cierra sesión y vuelve a la invitación. */
export async function salirYVolver(token: string) {
  const auth = await crearAccionesAuth();
  await auth?.signOut();
  redirect(TOKEN_INVITACION.test(token) ? `/invitacion/${token}` : "/login");
}
