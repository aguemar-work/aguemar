/**
 * Content-Security-Policy en modo solo reporte (HU 4.2): no bloquea nada, solo avisa qué se
 * bloquearía. Los reportes van a Sentry si hay DSN. Cuando lleve semanas sin reportes
 * inesperados, se puede pasar a `Content-Security-Policy` (con nonces para quitar 'unsafe-inline').
 *
 * Lo usa next.config.ts, así que no importa nada con el alias `@/`.
 */
export function politicaCsp(dsn?: string, entorno?: string): string {
  const directivas = [
    "default-src 'self'",
    // Next mete scripts en línea sin nonce; Vercel Analytics se sirve desde /_vercel (mismo origen).
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];
  const reporte = urlReporteCsp(dsn, entorno);
  if (reporte) directivas.push(`report-uri ${reporte}`);
  return directivas.join("; ");
}

/** Endpoint de seguridad de Sentry a partir del DSN (https://<clave>@<host>/<proyecto>). */
export function urlReporteCsp(dsn?: string, entorno?: string): string | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const proyecto = u.pathname.replace(/^\//, "");
    if (!u.username || !/^\d+$/.test(proyecto)) return null;
    const params = new URLSearchParams({ sentry_key: u.username });
    if (entorno) params.set("sentry_environment", entorno);
    return `${u.protocol}//${u.host}/api/${proyecto}/security/?${params.toString()}`;
  } catch {
    return null;
  }
}
