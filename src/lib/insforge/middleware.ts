import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";
import { envPublico } from "@/lib/env";

const RUTAS_PROTEGIDAS = ["/panel", "/w", "/sin-acceso"];
const RUTAS_SOLO_INVITADO = ["/login"];

/**
 * Refresca la sesión en cada petición (para que los Server Components vean
 * cookies frescas) y protege /panel. Si InsForge no está configurado, deja
 * pasar: la UI mostrará el aviso.
 */
export async function actualizarSesion(request: NextRequest) {
  const respuesta = NextResponse.next({ request });

  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return respuesta;

  const { accessToken } = await updateSession({
    baseUrl,
    anonKey,
    requestCookies: request.cookies,
    responseCookies: respuesta.cookies,
  });

  const { pathname } = request.nextUrl;
  const esProtegida = RUTAS_PROTEGIDAS.some((r) => pathname.startsWith(r));
  const esSoloInvitado = RUTAS_SOLO_INVITADO.some((r) => pathname.startsWith(r));

  if (!accessToken && esProtegida) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(destino);
  }

  if (accessToken && esSoloInvitado) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/panel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
