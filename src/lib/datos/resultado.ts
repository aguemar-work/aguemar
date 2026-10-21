import { traducirError } from "@/lib/insforge/errores";

/** Resultado uniforme de las Server Actions: éxito con datos o error con mensaje. */
export type Resultado<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; campo?: string };

export function exito<T>(data: T): Resultado<T> {
  return { ok: true, data };
}

export function fallo<T = never>(error: string, campo?: string): Resultado<T> {
  return { ok: false, error, campo };
}

/**
 * Envoltorio de las Server Actions: corre `fn` y, si lanza, devuelve el error ya traducido para la
 * persona. Lo que no sabemos traducir llega a Sentry con la etiqueta `accion` (módulo.nombre) y la
 * persona recibe una referencia, nunca el detalle técnico. Las validaciones previas y los retornos
 * `fallo(...)` esperados van dentro de `fn` sin ceremonia: solo lo que lanza pasa por aquí.
 */
export async function accion<T>(nombre: string, fn: () => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await fn();
  } catch (e) {
    return fallo(traducirError(e, nombre).mensaje);
  }
}

export class SinSesionError extends Error {
  constructor() {
    super("No hay sesión activa.");
    this.name = "SinSesionError";
  }
}

export class SinPermisoError extends Error {
  constructor() {
    super("Solo el propietario puede hacer esto.");
    this.name = "SinPermisoError";
  }
}
