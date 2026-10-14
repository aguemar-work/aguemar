import { obtenerRol } from "@/lib/insforge/server";
import { obtenerCotizacion } from "@/lib/datos/cotizaciones";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { fechaVence } from "@/lib/cotizacion";
import { responderPdfCotizacion } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF de una cotización para el propietario (RLS por owner_id). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const [c, marca] = await Promise.all([obtenerCotizacion(id), obtenerPerfilMarca()]);
  if (!c || !c.clientes) return new Response("No encontrada", { status: 404 });

  const aceptacion = c.aceptaciones[0];
  return responderPdfCotizacion(
    {
      numero: c.numero,
      fecha: c.fecha,
      vence: fechaVence(c.fecha, c.validez_dias),
      asunto: c.asunto,
      area: c.area,
      estado: c.estado,
      moneda: c.moneda,
      igv_pct: c.igv_pct,
      igv_modo: c.igv_modo,
      subtotal: c.subtotal,
      igv: c.igv,
      total: c.total,
      condiciones: c.condiciones,
      items: c.cotizacion_items,
      aceptacion: aceptacion ? { nombre: aceptacion.nombre, dni: aceptacion.dni, aceptado_en: aceptacion.aceptado_en } : null,
      cliente: c.clientes,
      marca,
    },
    request,
  );
}
