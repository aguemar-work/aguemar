import type { Metadata } from "next";
import { RUTA_IDIOMA, TEXTOS, type Idioma } from "@/lib/landing-textos";

/** Metadatos de la landing por idioma, con `hreflang` cruzado entre / y /en. */
export function metadataLanding(idioma: Idioma): Metadata {
  const m = TEXTOS[idioma].meta;
  return {
    title: { absolute: m.titulo },
    description: m.descripcion,
    alternates: {
      canonical: RUTA_IDIOMA[idioma],
      languages: { "es-PE": RUTA_IDIOMA.es, en: RUTA_IDIOMA.en, "x-default": RUTA_IDIOMA.es },
    },
    openGraph: { type: "website", locale: m.locale, url: RUTA_IDIOMA[idioma], siteName: "aguemar", title: m.tituloCorto, description: m.descripcion },
    twitter: { card: "summary_large_image", title: m.tituloCorto, description: m.descripcion },
  };
}
