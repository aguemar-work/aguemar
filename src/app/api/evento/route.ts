import { NextResponse, type NextRequest } from "next/server";
import { clienteAnonimo } from "@/lib/datos/landing";
import { ORIGENES, type Origen } from "@/lib/origen";

const EVENTOS = new Set(["whatsapp_click", "correo_click"]);

/**
 * Cuenta un clic de la landing (WhatsApp o correo) con registrar_evento: solo suma uno al
 * contador del día por evento y origen; no guarda IP, user agent ni nada de la persona.
 * El formulario enviado se cuenta en enviarContacto, en el servidor.
 */
export async function POST(req: NextRequest) {
  // Solo desde el propio sitio (el navegador manda Origin en los POST).
  const origin = req.headers.get("origin");
  if (origin && URL.parse(origin)?.host !== req.nextUrl.host) return new NextResponse(null, { status: 403 });

  let datos: { evento?: unknown; origen?: unknown };
  try {
    datos = JSON.parse((await req.text()).slice(0, 500));
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof datos.evento !== "string" || !EVENTOS.has(datos.evento)) return new NextResponse(null, { status: 400 });
  const origen: Origen = ORIGENES.includes(datos.origen as Origen) ? (datos.origen as Origen) : "otro";

  const { error } = (await clienteAnonimo()?.database.rpc("registrar_evento", { p_evento: datos.evento, p_origen: origen })) ?? { error: null };
  if (error) console.error("[evento] registrar_evento falló:", error.message);
  return new NextResponse(null, { status: 204 });
}
