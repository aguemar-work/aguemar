import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { envPublico } from "@/lib/env";

const RUTAS_PROTEGIDAS = ["/panel"];
const RUTAS_SOLO_INVITADO = ["/login"];

/**
 * Refresca la sesión en cada petición y protege /panel.
 * Si Supabase no está configurado, deja pasar: la UI mostrará el aviso.
 */
export async function actualizarSesion(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const url = envPublico.NEXT_PUBLIC_SUPABASE_URL;
  const key = envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return respuesta;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        respuesta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
      },
    },
  });

  // No colocar lógica entre createServerClient y getUser: evita cierres de sesión aleatorios.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esProtegida = RUTAS_PROTEGIDAS.some((r) => pathname.startsWith(r));
  const esSoloInvitado = RUTAS_SOLO_INVITADO.some((r) => pathname.startsWith(r));

  if (!user && esProtegida) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.searchParams.set("siguiente", pathname);
    return NextResponse.redirect(destino);
  }

  if (user && esSoloInvitado) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/panel";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}
