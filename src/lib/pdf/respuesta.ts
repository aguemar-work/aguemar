import { nombreArchivo } from "@/lib/cotizacion";
import { pdfCotizacion, type DatosCotizacionPdf } from "./cotizacion-pdf";

/** Respuesta HTTP con el PDF: en línea para la vista previa, o como descarga con ?descargar=1. */
export async function responderPdfCotizacion(datos: DatosCotizacionPdf, request: Request): Promise<Response> {
  const pdf = await pdfCotizacion(datos);
  const archivo = nombreArchivo(datos.numero, datos.cliente.nombre);
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
