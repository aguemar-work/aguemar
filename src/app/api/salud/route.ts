import { NextResponse } from "next/server";
import { envPublico } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Salud del sitio, para el monitor de uptime (README → Monitor de uptime y función caliente).
 *
 * Además de decir si la app responde, hace una petición breve a InsForge: así el monitor
 * mantiene caliente la función de Vercel y la conexión con la base, y el primer clic de
 * Alejandro no paga el arranque en frío (2–4 s medidos tras unos minutos sin visitas).
 * No toca datos ni exige sesión; responde 503 si InsForge no contesta en 5 s.
 */
export async function GET() {
  const base = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const inicio = Date.now();
  let backend: "ok" | "sin_configurar" | "error" = "sin_configurar";
  if (base) {
    try {
      const respuesta = await fetch(new URL("/api/health", base), { cache: "no-store", signal: AbortSignal.timeout(5000) });
      backend = respuesta.ok ? "ok" : "error";
    } catch {
      backend = "error";
    }
  }
  const ok = backend !== "error";
  return NextResponse.json(
    { ok, backend, ms: Date.now() - inicio, version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
