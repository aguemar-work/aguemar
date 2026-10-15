import type { NextConfig } from "next";

// Archivos que el PDF lee del disco: en Vercel hay que incluirlos explícitamente en la función.
const archivosPdf = ["./src/lib/pdf/fuentes/**", "./public/logo.svg", "./public/logo-light.svg"];

const nextConfig: NextConfig = {
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
  },
};

export default nextConfig;
