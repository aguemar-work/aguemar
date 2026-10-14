import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite compilar en otra carpeta (NEXT_DIST_DIR=.next-verify) sin pisar el .next del servidor de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
