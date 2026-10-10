"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { envPublico } from "@/lib/env";

/** Cliente de Supabase para componentes de cliente. Devuelve null si no está configurado. */
export function crearClienteNavegador() {
  const url = envPublico.NEXT_PUBLIC_SUPABASE_URL;
  const key = envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createBrowserClient<Database>(url, key);
}
