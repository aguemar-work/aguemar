import { obtenerRol } from "@/lib/insforge/server";
import { obtenerFicha } from "@/lib/datos/fichas";
import { responderPdfFicha } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF de una ficha para el propietario (ficha_panel valida que sea suya). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const f = await obtenerFicha(id);
  if (!f) return new Response("No encontrada", { status: 404 });
  return responderPdfFicha(f, request);
}
