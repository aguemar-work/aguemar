import { nombreArchivo } from "@/lib/cotizacion";
import { urlPortal, type FichaJson } from "@/lib/documentos";
import { pdfCotizacion, type DatosCotizacionPdf } from "./cotizacion-pdf";
import { pdfFicha } from "./ficha-pdf";

function responder(pdf: Uint8Array, archivo: string, request: Request): Response {
  const descargar = new URL(request.url).searchParams.has("descargar");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${archivo}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

/** Origen público para los enlaces del portal: el dominio configurado o el de la petición. */
export function origenPublico(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

/** Respuesta HTTP con el PDF de una cotización: en línea para la vista previa, o como descarga con ?descargar=1. */
export async function responderPdfCotizacion(datos: DatosCotizacionPdf, request: Request): Promise<Response> {
  return responder(await pdfCotizacion(datos), nombreArchivo(datos.numero, datos.cliente.nombre), request);
}

/** PDF de una ficha; si está publicada y tiene enlace, lleva el QR de verificación. */
export async function responderPdfFicha(f: FichaJson, request: Request): Promise<Response> {
  const url = f.publicada && f.token ? urlPortal(origenPublico(request), f.token) : null;
  return responder(await pdfFicha(f, url), nombreArchivo(f.numero ?? "FT-borrador", f.cliente.nombre), request);
}
