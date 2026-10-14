import { cookies } from "next/headers";
import { createServerClient, createAuthActions } from "@insforge/sdk/ssr";
import { envPublico } from "@/lib/env";

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
export async function crearClienteServidor() {
  const cfg = config();
  if (!cfg) return null;
  const almacen = await cookies();
  return createServerClient({ ...cfg, cookies: almacen });
}

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

/** Usuario autenticado o null. */
export async function obtenerUsuario(): Promise<UsuarioSesion | null> {
  const insforge = await crearClienteServidor();
  if (!insforge) return null;
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data.user) return null;
  const perfil = data.user.profile as { name?: string } | null;
  return { id: data.user.id, email: data.user.email, nombre: perfil?.name ?? null };
}

export type Rol =
  | { tipo: "propietario"; usuario: UsuarioSesion }
  | { tipo: "empresa"; usuario: UsuarioSesion; slug: string; nombre: string }
  | { tipo: "sin_acceso"; usuario: UsuarioSesion }
  | { tipo: "anonimo" };

/**
 * Rol del usuario actual: propietario (tiene perfil de marca), usuario de una
 * empresa (clientes.usuario_id) o sin acceso.
 */
export async function obtenerRol(): Promise<Rol> {
  const insforge = await crearClienteServidor();
  if (!insforge) return { tipo: "anonimo" };
  const usuario = await obtenerUsuario();
  if (!usuario) return { tipo: "anonimo" };

  const marca = await insforge.database.from("perfil_marca").select("id").limit(1).maybeSingle();
  if (!marca.error && marca.data) return { tipo: "propietario", usuario };

  const { data } = await insforge.database.rpc("ws_mi_empresa");
  const empresa = data as { slug?: string; nombre?: string } | null;
  if (empresa?.slug) return { tipo: "empresa", usuario, slug: empresa.slug, nombre: empresa.nombre ?? "" };

  return { tipo: "sin_acceso", usuario };
}

/** Ruta de inicio según el rol. */
export function rutaInicio(rol: Rol): string {
  if (rol.tipo === "propietario") return "/panel";
  if (rol.tipo === "empresa") return `/w/${rol.slug}`;
  if (rol.tipo === "sin_acceso") return "/sin-acceso";
  return "/login";
}
