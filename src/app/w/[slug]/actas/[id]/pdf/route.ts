import { ws } from "@/lib/datos/workspace";
import { responderPdfActa } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF para la empresa: ws_acta valida empresa, publicación y módulo Documentos. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await ws.acta(id).catch(() => null);
  if (!doc) return new Response("No encontrado", { status: 404 });
  return responderPdfActa(doc, request);
}
