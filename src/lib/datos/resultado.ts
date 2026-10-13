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

export class SinSesionError extends Error {
  constructor() {
    super("No hay sesión activa.");
    this.name = "SinSesionError";
  }
}
