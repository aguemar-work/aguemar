import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, createAuthActions, DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { envPublico } from "@/lib/env";
import { claimsDelToken } from "./jwt";

function config() {
  const baseUrl = envPublico.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = envPublico.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) return null;
  return { baseUrl, anonKey };
}

/**
 * Cliente de InsForge para Server Components, Server Actions y Route Handlers.
 * Lee el access token de la cookie y lo envía como bearer en cada llamada.
 * Devuelve null cuando InsForge no está configurado, para que la UI pueda avisar.
 */
export const crearClienteServidor = cache(async () => {
  const cfg = config();
  if (!cfg) return null;
  const almacen = await cookies();
  return createServerClient({ ...cfg, cookies: almacen });
});

/**
 * Acciones de auth que escriben cookies (login, logout). Solo en Server Actions
 * y Route Handlers, nunca en Server Components.
 */
export async function crearAccionesAuth() {
  const cfg = config();
  if (!cfg) return null;
  const almacen = await cookies();
  return createAuthActions({ ...cfg, cookies: almacen });
}

export interface UsuarioSesion {
  id: string;
  email: string;
  nombre: string | null;
}

/**
 * Usuario autenticado o null. Se resuelve una sola vez por petición (cache de React).
 *
 * El middleware ya refrescó el token, así que la identidad se lee de sus claims
 * sin ir a InsForge: cada consulta a la base viaja con el mismo token y la base
 * verifica su firma (RLS), de modo que un token alterado no obtiene datos.
 * Si el token no trae los claims esperados, se consulta la sesión por red.
 */
export const obtenerUsuario = cache(async (): Promise<UsuarioSesion | null> => {
  if (!config()) return null;
  const almacen = await cookies();
  const claims = claimsDelToken(almacen.get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value);
  if (claims && claims.email && (!claims.exp || claims.exp * 1000 > Date.now())) {
    return { id: claims.sub, email: claims.email, nombre: null };
  }

  const insforge = await crearClienteServidor();
  if (!insforge) return null;
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data.user) return null;
  const perfil = data.user.profile as { name?: string } | null;
  return { id: data.user.id, email: data.user.email, nombre: perfil?.name ?? null };
});

export type Rol =
  | { tipo: "propietario"; usuario: UsuarioSesion }
  | { tipo: "empresa"; usuario: UsuarioSesion; slug: string; nombre: string }
  | { tipo: "sin_acceso"; usuario: UsuarioSesion }
  | { tipo: "anonimo" };

/**
 * Rol del usuario actual: propietario (tiene perfil de marca), usuario de una
 * empresa (clientes.usuario_id) o sin acceso.
 */
export const obtenerRol = cache(async (): Promise<Rol> => {
  const insforge = await crearClienteServidor();
  if (!insforge) return { tipo: "anonimo" };
  const usuario = await obtenerUsuario();
  if (!usuario) return { tipo: "anonimo" };

  // Las dos preguntas van en paralelo: una sola ida y vuelta a InsForge.
  const [marca, ws] = await Promise.all([
    insforge.database.from("perfil_marca").select("id").limit(1).maybeSingle(),
    insforge.database.rpc("ws_mi_empresa"),
  ]);
  if (!marca.error && marca.data) return { tipo: "propietario", usuario };

  const empresa = ws.data as { slug?: string; nombre?: string } | null;
  if (empresa?.slug) return { tipo: "empresa", usuario, slug: empresa.slug, nombre: empresa.nombre ?? "" };

  return { tipo: "sin_acceso", usuario };
});

/** Ruta de inicio según el rol. */
export function rutaInicio(rol: Rol): string {
  if (rol.tipo === "propietario") return "/panel";
  if (rol.tipo === "empresa") return `/w/${rol.slug}`;
  if (rol.tipo === "sin_acceso") return "/sin-acceso";
  return "/login";
}
