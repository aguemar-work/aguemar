import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/insforge/middleware";

/**
 * Next 16 renombró "middleware" a "proxy" (mismo matcher y misma función; corre en Node).
 * La lógica sigue en src/lib/insforge/middleware.ts.
 */
export async function proxy(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  /*
   * Solo las rutas que leen la sesión: login, panel, workspace, sin-acceso e invitación.
   * La landing (/), el portal público (/d/*), /privacidad, los estáticos y la
   * ruta de refresh no pasan por aquí: ahorran una invocación de edge por visita.
   * Una ruta nueva que use cookies de sesión debe añadirse a esta lista.
   */
  matcher: ["/login/:path*", "/panel/:path*", "/w/:path*", "/sin-acceso", "/invitacion/:path*"],
};
