import { createClient } from "@insforge/sdk";
import { envPublico } from "@/lib/env";

/**
 * Crea un usuario en InsForge sin tocar las cookies de la sesión actual.
 * Usa un cliente independiente en modo servidor: la sesión que devuelve el
 * registro se descarta. Requiere que el proyecto no exija verificación de correo
 * (requireEmailVerification = false) para que el usuario quede activo al instante.
 */
export async function crearUsuarioInsforge(correo: string, contrasena: string, nombre?: string) {
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return { id: null, error: "InsForge no está configurado." };

  const cliente = createClient({ baseUrl, anonKey, isServerMode: true });
  const { data, error } = await cliente.auth.signUp({ email: correo, password: contrasena, name: nombre });
  if (error || !data?.user?.id) {
    const mensaje = error?.message ?? "No se pudo crear el usuario.";
    const duplicado = error?.statusCode === 409 || /exist|registered|duplicate/i.test(mensaje);
    return { id: null, error: duplicado ? "Ese correo ya tiene un usuario en InsForge. Usa otro o vincúlalo desde la base." : mensaje };
  }
  return { id: data.user.id as string, error: null };
}
