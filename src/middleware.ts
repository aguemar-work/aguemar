import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/insforge/middleware";

export async function middleware(request: NextRequest) {
  return actualizarSesion(request);
}

export const config = {
  matcher: [
    /*
     * Todo excepto estáticos, imágenes, la ruta de refresh y archivos con extensión.
     */
    "/((?!_next/static|_next/image|api/auth/refresh|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
