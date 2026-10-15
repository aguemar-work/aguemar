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

/** Marca y servicios visibles. Si la base no responde, la landing se muestra igual con sus textos. */
export async function datosLanding(): Promise<DatosLanding> {
  const vacio: DatosLanding = { marca: null, servicios: [] };
  const cliente = clienteAnonimo();
  if (!cliente) return vacio;
  try {
    const { data, error } = await cliente.database.rpc("landing_datos");
    if (error || !data) return vacio;
    const d = data as Partial<DatosLanding>;
    return { marca: d.marca ?? null, servicios: d.servicios ?? [] };
  } catch {
    return vacio;
  }
}
