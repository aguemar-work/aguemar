import { esEquipo, obtenerRol } from "@/lib/insforge/server";
import { obtenerInforme } from "@/lib/datos/informes";
import { responderPdfInforme } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rol = await obtenerRol();
  if (!esEquipo(rol)) return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const doc = await obtenerInforme(id);
  if (!doc) return new Response("No encontrado", { status: 404 });
  return responderPdfInforme(doc, request);
}
