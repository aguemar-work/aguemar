import { ws } from "@/lib/datos/workspace";
import { responderPdfCotizacion } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF de una cotización para la empresa: los datos salen de ws_cotizacion (su empresa, sin borradores). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await ws.cotizacion(id).catch(() => null);
  if (!c) return new Response("No encontrada", { status: 404 });
  return responderPdfCotizacion(c, request);
}
