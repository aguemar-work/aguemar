"use client";

import { createBrowserClient } from "@insforge/sdk/ssr";
import { envPublico } from "@/lib/env";

/**
 * Cliente de InsForge para componentes de cliente. Lee el access token de la
 * cookie y lo renueva a través de /api/auth/refresh. Su auth es solo lectura:
 * login y logout van por Server Actions. Devuelve null si no está configurado.
 */
export function crearClienteNavegador() {
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return createBrowserClient({ baseUrl, anonKey, refreshUrl: "/api/auth/refresh" });
}
