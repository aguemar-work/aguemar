import { crearClienteServidor, obtenerRol, obtenerUsuario } from "@/lib/insforge/server";
import { SinPermisoError, SinSesionError } from "./resultado";

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

/**
 * Exige que la sesión sea del propietario (es_propietario() en la base).
 *
 * La RLS ya impide que otro usuario lea o escriba datos del panel, así que no hace
 * falta en cada acción (costaría una ida y vuelta más). Úsalo antes de hacer algo
 * que la RLS no cubre, como crear usuarios en InsForge.
 */
export async function exigirPropietario() {
  const rol = await obtenerRol();
  if (rol.tipo === "anonimo") throw new SinSesionError();
  if (rol.tipo !== "propietario") throw new SinPermisoError();
}
