import { crearClienteServidor, obtenerUsuario } from "@/lib/insforge/server";
import { SinSesionError } from "./resultado";

/**
 * Cliente de datos con la sesión del usuario (RLS aplica). Lanza si no hay
 * sesión o si InsForge no está configurado. Devuelve también el id del usuario,
 * que las inserciones usan como owner_id.
 */
export async function conSesion() {
  const insforge = await crearClienteServidor();
  if (!insforge) throw new SinSesionError();
  const usuario = await obtenerUsuario();
  if (!usuario) throw new SinSesionError();
  return { db: insforge.database, usuario };
}

/** Variante que devuelve null en lugar de lanzar, para páginas que pueden mostrarse sin datos. */
export async function conSesionOpcional() {
  try {
    return await conSesion();
  } catch {
    return null;
  }
}
