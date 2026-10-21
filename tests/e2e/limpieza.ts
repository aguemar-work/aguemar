/**
 * Limpieza de los datos que crean las pruebas de navegador de las fases (fase2 … fase9), por API.
 *
 * Cada prueba termina con un test "limpieza" que borra por la interfaz, pero si un test intermedio
 * falla, Playwright salta el resto de la serie y ese test no corre: quedaban empresas, trabajos y
 * fichas "E2E …" en staging. Aquí:
 *  - `limpiarSufijo` va en `test.afterAll` de cada archivo (corre aunque algo falle) y borra lo de
 *    su propia corrida.
 *  - `barrerHuerfanos` va en el `globalSetup` y borra lo que dejó una corrida anterior (sin otra
 *    corrida en marcha, nada de esto está en uso).
 *
 * Solo con cuentas de prueba (correo `.test`): jamás toca una base con datos reales. Lo aceptado no se
 * borra (ADR-07): esas filas fallan al borrarse y se ignoran, quedan marcadas con "E2E".
 */
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

export function hayCuentaDePrueba(): boolean {
  return Boolean(URL_BASE && ANON && EMAIL && PASSWORD && /\.test$/.test(EMAIL));
}

async function duenio() {
  // Import dinámico: el cargador CJS de Playwright no resuelve los "exports" del SDK.
  const { createClient } = await import("@insforge/sdk");
  const c = createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
  const { error } = await c.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
  if (error) throw new Error(`Limpieza e2e: no se pudo iniciar sesión (${error.message ?? "sin detalle"}).`);
  return c;
}

/** Tablas y columna donde cada prueba pone su nombre, en el orden en que se pueden borrar (lo que depende, primero). */
const OBJETIVOS: { tabla: string; columna: string; prefijo: string }[] = [
  { tabla: "fichas", columna: "titular", prefijo: "Ficha" },
  { tabla: "actividades", columna: "titulo", prefijo: "Reunión" },
  { tabla: "informes", columna: "titulo", prefijo: "Informe" },
  { tabla: "trabajos", columna: "titulo", prefijo: "Trabajo" },
  { tabla: "cotizaciones", columna: "asunto", prefijo: "Cotización" },
  { tabla: "equipos", columna: "modelo", prefijo: "Modelo" },
  { tabla: "clientes", columna: "nombre", prefijo: "Cliente" },
];

async function borrar(patron: (prefijo: string) => string) {
  if (!hayCuentaDePrueba()) return;
  const c = await duenio();
  for (const o of OBJETIVOS) {
    // Un borrado que falla (p. ej. una cotización aceptada) no impide seguir con el resto.
    await c.database.from(o.tabla).delete().like(o.columna, patron(o.prefijo));
  }
}

/** Borra lo que creó esta corrida (el sufijo `E2E <hora en base 36>` de cada archivo). */
export async function limpiarSufijo(sufijo: string) {
  await borrar((prefijo) => `${prefijo} ${sufijo}%`);
}

/** Borra lo que dejaron corridas anteriores que no llegaron a limpiar. */
export async function barrerHuerfanos() {
  await borrar((prefijo) => `${prefijo} E2E %`);
}

/** Módulos de una empresa, para restaurarlos si una prueba los dejó cambiados. */
export async function modulosDe(slug: string): Promise<string[] | null> {
  if (!hayCuentaDePrueba()) return null;
  const c = await duenio();
  const r = await c.database.from("clientes").select("modulos").eq("slug", slug).maybeSingle();
  return (r.data?.modulos as string[] | undefined) ?? null;
}

export async function restaurarModulos(slug: string, modulos: string[] | null) {
  if (!modulos || !hayCuentaDePrueba()) return;
  const c = await duenio();
  await c.database.from("clientes").update({ modulos }).eq("slug", slug);
}
