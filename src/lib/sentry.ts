import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Alertas de error con Sentry (HU 4.1, ARQUITECTURA.md ADR-10): solo errores, con ruta y stack,
 * sin datos personales. Sin DSN (local, CI, preview sin variable) el SDK queda apagado.
 *
 * Lo que nunca sale: usuario, cookies, cabeceras, cuerpo, query string, breadcrumbs (traen URLs y
 * mensajes de consola) ni los tokens de /d/… e /invitacion/…; correos y números de documento que
 * aparezcan en un mensaje de error se reemplazan.
 */
export function opcionesSentry(dsn: string | undefined, entorno: string | undefined) {
  return {
    dsn,
    enabled: Boolean(dsn),
    environment: entorno || "development",
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: limpiarEvento,
  };
}

/** Rutas con un secreto en la URL: el token se cambia por [token]. */
const RUTAS_CON_TOKEN = /\/(d|invitacion)\/[^/?#\s"')]+/g;
const CORREO = /[^\s@"'<>()]+@[^\s@"'<>()]+\.[a-z]{2,}/gi;
// DNI (8 dígitos) y RUC (11) sueltos; un uuid no coincide porque sus tramos llevan letras o guiones.
const DOCUMENTO = /(?<![\w-])\d{8}(?:\d{3})?(?![\w-])/g;

/** Ruta sin query ni fragmento y con los tokens tapados. Acepta una URL completa o solo la ruta. */
export function redactarRuta(url: string): string {
  let ruta = url;
  try {
    const u = new URL(url, "http://x");
    ruta = /^https?:\/\//i.test(url) ? `${u.origin}${u.pathname}` : u.pathname;
  } catch {
    ruta = url.split(/[?#]/)[0] ?? url;
  }
  return ruta.replace(RUTAS_CON_TOKEN, "/$1/[token]");
}

/** Texto libre (mensaje de error): sin correos, DNI/RUC ni tokens de enlaces. */
export function redactarTexto(texto: string): string {
  return texto.replace(RUTAS_CON_TOKEN, "/$1/[token]").replace(CORREO, "[correo]").replace(DOCUMENTO, "[número]");
}

export function limpiarEvento(event: ErrorEvent): ErrorEvent | null {
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  if (event.request) {
    event.request = { method: event.request.method, url: event.request.url ? redactarRuta(event.request.url) : undefined };
  }
  if (event.transaction) event.transaction = redactarRuta(event.transaction);
  if (event.message) event.message = redactarTexto(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = redactarTexto(ex.value);
  }
  // captureRequestError guarda la ruta pedida en contexts.nextjs.
  const nextjs = event.contexts?.nextjs as Record<string, unknown> | undefined;
  if (nextjs) {
    for (const [k, v] of Object.entries(nextjs)) if (typeof v === "string") nextjs[k] = redactarRuta(v);
  }
  if (event.tags?.url && typeof event.tags.url === "string") event.tags.url = redactarRuta(event.tags.url);
  return event;
}
