import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/insforge/middleware";

export async function middleware(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  /*
   * Solo las rutas que leen la sesión: login, panel, workspace y sin-acceso.
   * La landing (/), el portal público (/d/*), /privacidad, los estáticos y la
   * ruta de refresh no pasan por aquí: ahorran una invocación de edge por visita.
   * Una ruta nueva que use cookies de sesión debe añadirse a esta lista.
   */
  matcher: ["/login/:path*", "/panel/:path*", "/w/:path*", "/sin-acceso"],
};
