import * as Sentry from "@sentry/nextjs";
import { nombreArchivo } from "@/lib/cotizacion";
import { urlPortal, type ActaJson, type BriefJson, type FichaJson, type InformeJson } from "@/lib/documentos";
import { pdfCotizacion, type DatosCotizacionPdf } from "./cotizacion-pdf";
import { pdfFicha } from "./ficha-pdf";
import { pdfActa, pdfBrief } from "./brief-acta-pdf";
import { pdfInforme } from "./informe-pdf";

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

/**
 * Genera el PDF y, si falla, deja el error en los registros (con el documento) y responde
 * con un mensaje claro en lugar de la página genérica de error del navegador.
 */
async function generar(documento: string, crear: () => Promise<Uint8Array>, archivo: string, request: Request): Promise<Response> {
  try {
    return responder(await crear(), archivo, request);
  } catch (e) {
    console.error(`[pdf] No se pudo generar ${documento}:`, e);
    Sentry.captureException(e, { tags: { pdf: documento } });
    return new Response(`No se pudo generar el PDF de ${documento}. Ya quedó registrado el error; inténtalo en unos minutos o escríbenos.`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
}

/** Origen público para los enlaces del portal: el dominio configurado o el de la petición. */
export function origenPublico(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

/** Respuesta HTTP con el PDF de una cotización: en línea para la vista previa, o como descarga con ?descargar=1. */
export async function responderPdfCotizacion(datos: DatosCotizacionPdf, request: Request): Promise<Response> {
  return generar(datos.numero ?? "la cotización (borrador)", () => pdfCotizacion(datos), nombreArchivo(datos.numero, datos.cliente.nombre), request);
}

/** PDF de una ficha; si está publicada y tiene enlace, lleva el QR de verificación. */
export async function responderPdfFicha(f: FichaJson, request: Request): Promise<Response> {
  const url = f.publicada && f.token ? urlPortal(origenPublico(request), f.token) : null;
  return generar(f.numero ?? "la ficha (borrador)", () => pdfFicha(f, url), nombreArchivo(f.numero ?? "FT-borrador", f.cliente.nombre), request);
}

export async function responderPdfBrief(b: BriefJson, request: Request): Promise<Response> {
  return generar(b.numero ?? "el brief (borrador)", () => pdfBrief(b), nombreArchivo(b.numero ?? "BR-borrador", b.cliente.nombre), request);
}

export async function responderPdfActa(a: ActaJson, request: Request): Promise<Response> {
  return generar(a.numero ?? "el acta (borrador)", () => pdfActa(a), nombreArchivo(a.numero ?? "AE-borrador", a.cliente.nombre), request);
}

export async function responderPdfInforme(i: InformeJson, request: Request): Promise<Response> {
  return generar(i.numero ?? "el informe (borrador)", () => pdfInforme(i), nombreArchivo(i.numero ?? "INF-borrador", i.cliente.nombre), request);
}
