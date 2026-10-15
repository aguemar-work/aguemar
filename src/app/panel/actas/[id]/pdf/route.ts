import { obtenerRol } from "@/lib/insforge/server";
import { obtenerActa } from "@/lib/datos/briefs-actas";
import { responderPdfActa } from "@/lib/pdf/respuesta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const doc = await obtenerActa(id);
  if (!doc) return new Response("No encontrado", { status: 404 });
  return responderPdfActa(doc, request);
}
