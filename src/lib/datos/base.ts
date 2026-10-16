import { notFound } from "next/navigation";
import { crearClienteServidor, obtenerRol, obtenerUsuario } from "@/lib/insforge/server";
import { SinPermisoError, SinSesionError } from "./resultado";
import { VISTAS_EQUIPO, selectParaEquipo } from "./vistas-equipo";

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

type Db = Awaited<ReturnType<typeof conSesion>>["db"];

/** Mismo cliente de datos, pero `from("clientes"|"trabajos")` y sus incrustaciones van a las vistas *_equipo. */
function dbParaEquipo(db: Db): Db {
  return new Proxy(db, {
    get(objetivo, prop, receptor) {
      if (prop === "from") {
        return (tabla: string) => {
          const consulta = objetivo.from(VISTAS_EQUIPO[tabla] ?? tabla);
          const seleccionar = consulta.select.bind(consulta);
          consulta.select = ((columnas?: string, ...resto: unknown[]) =>
            (seleccionar as (c?: string, ...r: unknown[]) => unknown)(selectParaEquipo(columnas ?? "*"), ...resto)) as typeof consulta.select;
          return consulta;
        };
      }
      const valor = Reflect.get(objetivo, prop, receptor);
      return typeof valor === "function" ? valor.bind(objetivo) : valor;
    },
  });
}

/**
 * Sesión para los loaders de las páginas del panel, que comparten propietario y
 * colaborador. Para el colaborador, trabajos y clientes se leen de las vistas sin
 * dinero ni notas (la base no le abre esas tablas). El rol ya está en caché en la
 * petición de una página; evita usarlo en Server Actions (sumaría una ida y vuelta).
 */
export async function conSesionPanel() {
  const sesion = await conSesion();
  const rol = await obtenerRol();
  if (rol.tipo !== "colaborador") return { ...sesion, rol };
  return { ...sesion, rol, db: dbParaEquipo(sesion.db) };
}

/** 404 para quien no es el propietario: páginas de dinero, leads, marca, accesos y equipo. */
export async function soloPropietario() {
  const rol = await obtenerRol();
  if (rol.tipo !== "propietario") notFound();
}
