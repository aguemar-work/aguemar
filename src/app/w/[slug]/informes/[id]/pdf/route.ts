import { ws } from "@/lib/datos/workspace";
import { responderPdfInforme } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF para la empresa: ws_informe valida empresa, publicación y módulo Informes. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await ws.informe(id).catch(() => null);
  if (!doc) return new Response("No encontrado", { status: 404 });
  return responderPdfInforme(doc, request);
}
