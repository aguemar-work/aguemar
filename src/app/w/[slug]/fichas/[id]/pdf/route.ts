import { ws } from "@/lib/datos/workspace";
import { responderPdfFicha } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF de una ficha publicada de la empresa (ws_ficha valida empresa, publicación y módulo). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await ws.ficha(id).catch(() => null);
  if (!f) return new Response("No encontrada", { status: 404 });
  return responderPdfFicha(f, request);
}
