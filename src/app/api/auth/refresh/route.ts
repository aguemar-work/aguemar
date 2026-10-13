import { createRefreshAuthRouter } from "@insforge/sdk/ssr";
import { envPublico } from "@/lib/env";

/**
 * Renueva el access token usando la cookie httpOnly de refresh.
 * Lo llama el cliente de navegador del SDK cuando el token vence.
 */
export const { POST } = createRefreshAuthRouter({
  baseUrl: envPublico.NEXT_PUBLIC_INSFORGE_URL,
  anonKey: envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY,
});
