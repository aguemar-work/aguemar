import { cookies } from "next/headers";
import { createServerClient, createAuthActions } from "@insforge/sdk/ssr";
import { envPublico } from "@/lib/env";

function config() {
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return { baseUrl, anonKey };
}

/**
 * Cliente de InsForge para Server Components, Server Actions y Route Handlers.
 * Lee el access token de la cookie y lo envía como bearer en cada llamada.
 * Devuelve null cuando InsForge no está configurado, para que la UI pueda avisar.
 */
export async function crearClienteServidor() {
  const cfg = config();
  if (!cfg) return null;
  const almacen = await cookies();
  return createServerClient({ ...cfg, cookies: almacen });
}

/**
 * Acciones de auth que escriben cookies (login, logout). Solo en Server Actions
 * y Route Handlers, nunca en Server Components.
 */
export async function crearAccionesAuth() {
  const cfg = config();
  if (!cfg) return null;
  const almacen = await cookies();
  return createAuthActions({ ...cfg, cookies: almacen });
}

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string | null;
}

/** Usuario autenticado o null. */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const insforge = await crearClienteServidor();
  if (!insforge) return null;
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data.user) return null;
  const perfil = data.user.profile as { name?: string } | null;
  return { id: data.user.id, email: data.user.email, nombre: perfil?.name ?? null };
}
