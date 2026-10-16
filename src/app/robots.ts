import type { MetadataRoute } from "next";
import { envPublico } from "@/lib/env";

/** Solo la landing es pública para buscadores: panel, espacios de empresas, documentos y login quedan fuera. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/w/", "/d/", "/login", "/sin-acceso", "/invitacion/", "/api/"] }],
    sitemap: `${envPublico.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
