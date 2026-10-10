import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { envPublico } from "@/lib/env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Devuelve null cuando Supabase no está configurado, para que la UI pueda avisar.
 */
export async function crearClienteServidor() {
  const url = envPublico.NEXT_PUBLIC_SUPABASE_URL;
  const key = envPublico.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const almacen = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return almacen.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            almacen.set(name, value, options),
          );
        } catch {
          // Llamado desde un Server Component: las cookies las refresca el middleware.
        }
      },
    },
  });
}

/** Usuario autenticado o null. */
export async function obtenerUsuario() {
  const supabase = await crearClienteServidor();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
