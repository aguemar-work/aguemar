import { createClient } from "@insforge/sdk";
import { envPublico } from "@/lib/env";
import type { DatosLanding } from "@/lib/landing";

/**
 * Cliente anónimo sin cookies: la landing no depende de la sesión, así que puede
 * generarse estática y regenerarse cada cierto tiempo (o al guardar servicios o marca).
 */
export function clienteAnonimo() {
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return createClient({ baseUrl, anonKey, isServerMode: true });
}

/**
 * Marca y servicios visibles.
 *
 * Sin InsForge configurado devuelve la versión vacía (la landing se muestra con sus
 * textos base). Con InsForge configurado, un fallo de la base **lanza**: durante una
 * regeneración ISR, Next conserva la última versión buena en lugar de publicar una
 * landing sin servicios, teléfono ni RUC durante una hora.
 */
export async function datosLanding(): Promise<DatosLanding> {
  const cliente = clienteAnonimo();
  if (!cliente) return { marca: null, servicios: [] };
  const { data, error } = await cliente.database.rpc("landing_datos");
  if (error) throw new Error(`landing_datos falló: ${error.message ?? "sin detalle"}`);
  const d = (data ?? {}) as Partial<DatosLanding>;
  return { marca: d.marca ?? null, servicios: d.servicios ?? [] };
}
