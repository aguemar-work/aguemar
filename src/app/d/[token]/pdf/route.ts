import { portalDocumento } from "@/lib/datos/portal";
import { responderPdfActa, responderPdfBrief, responderPdfCotizacion, responderPdfFicha } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF público por token: ficha publicada o cotización enviada. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await portalDocumento(token);
  if (!doc) return new Response("Enlace no válido", { status: 404, headers: { "X-Robots-Tag": "noindex" } });
  switch (doc.tipo) {
    case "ficha":
      return responderPdfFicha(doc.documento, request);
    case "brief":
      return responderPdfBrief(doc.documento, request);
    case "acta":
      return responderPdfActa(doc.documento, request);
    default:
      return responderPdfCotizacion(doc.documento, request);
  }
}
