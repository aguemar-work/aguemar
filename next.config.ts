import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { politicaCsp } from "./src/lib/csp";

// Archivos que el PDF lee del disco: en Vercel hay que incluirlos explícitamente en la función.
// pdfkit carga sus fuentes estándar (Helvetica, la de inicio del documento) con un require dinámico
// (`#standard-fonts/*`) que el rastreo no ve: sin ellas el PDF falla con MODULE_NOT_FOUND en Vercel.
const archivosPdf = ["./src/lib/pdf/fuentes/**", "./public/logo.svg", "./public/logo-light.svg", "./node_modules/pdfkit/js/standard-fonts/**"];

// Cabeceras de seguridad para todas las rutas (HSTS lo pone Vercel en el dominio).
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Solo reporta (no bloquea); en desarrollo no, porque React usa eval y llenaría la consola.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Content-Security-Policy-Report-Only", value: politicaCsp(process.env.NEXT_PUBLIC_SENTRY_DSN, process.env.VERCEL_ENV) }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecerasSeguridad }];
  },
  // Permite compilar en otra carpeta (NEXT_DIST_DIR=.next-verify) sin pisar el .next del servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // @react-pdf/renderer (y fontkit) funcionan mejor sin empaquetar, como en Node.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/panel/cotizaciones/[id]/pdf": archivosPdf,
    "/w/[slug]/cotizaciones/[id]/pdf": archivosPdf,
    "/panel/fichas/[id]/pdf": archivosPdf,
    "/w/[slug]/fichas/[id]/pdf": archivosPdf,
    "/d/[token]/pdf": archivosPdf,
    "/panel/briefs/[id]/pdf": archivosPdf,
    "/panel/actas/[id]/pdf": archivosPdf,
    "/w/[slug]/briefs/[id]/pdf": archivosPdf,
    "/w/[slug]/actas/[id]/pdf": archivosPdf,
    "/panel/informes/[id]/pdf": archivosPdf,
    "/w/[slug]/informes/[id]/pdf": archivosPdf,
    "/opengraph-image": archivosPdf,
  },
};

// Sentry (src/instrumentation*.ts). Con SENTRY_AUTH_TOKEN, SENTRY_ORG y SENTRY_PROJECT en Vercel sube los
// source maps (para ver el stack legible) y los borra del despliegue; sin ellos compila igual.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN, deleteSourcemapsAfterUpload: true },
  silent: !process.env.CI,
  telemetry: false,
  // Sin trazas ni Session Replay (src/lib/sentry.ts): ese código no viaja al navegador.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
});
