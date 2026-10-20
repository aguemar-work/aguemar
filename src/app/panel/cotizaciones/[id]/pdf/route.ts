import { obtenerRol } from "@/lib/insforge/server";
import { obtenerDocumentoCotizacion } from "@/lib/datos/cotizaciones";
import { responderPdfCotizacion } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PDF de una cotización para el propietario: sale de cotizacion_panel, la misma proyección
 * que el workspace y el portal (si está aceptada, con la copia de lo que se aceptó).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const c = await obtenerDocumentoCotizacion(id);
  if (!c) return new Response("No encontrada", { status: 404 });
  return responderPdfCotizacion(c, request);
}
