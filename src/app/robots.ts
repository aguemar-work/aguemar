import type { MetadataRoute } from "next";
import { envPublico } from "@/lib/env";

/**
 * Solo la landing es pública para buscadores. /d/ y /login no se bloquean aquí a propósito: llevan
 * `noindex` (metadatos y cabecera X-Robots-Tag) y Google solo lo lee si puede rastrear la URL. Si se
 * bloquearan, un enlace externo a un documento podría listarse sin contenido y con el token a la vista.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/panel", "/w/", "/sin-acceso", "/invitacion/", "/api/"] }],
    sitemap: `${envPublico.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
