import { portalDocumento } from "@/lib/datos/portal";
import { responderPdfCotizacion, responderPdfFicha } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF público por token: ficha publicada o cotización enviada. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await portalDocumento(token);
  if (!doc) return new Response("Enlace no válido", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  return doc.tipo === "ficha" ? responderPdfFicha(doc.documento, request) : responderPdfCotizacion(doc.documento, request);
}
