import type { NextConfig } from "next";

// Archivos que el PDF lee del disco: en Vercel hay que incluirlos explícitamente en la función.
const archivosPdf = ["./src/lib/pdf/fuentes/**", "./public/logo.svg", "./public/logo-light.svg"];

// Cabeceras de seguridad para todas las rutas (HSTS lo pone Vercel en el dominio).
const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
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

export default nextConfig;
