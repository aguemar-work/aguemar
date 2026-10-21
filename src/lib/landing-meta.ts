import type { Metadata } from "next";
import { RUTA_IDIOMA, TEXTOS, type Idioma } from "@/lib/landing-textos";
import { numeroWhatsApp, type MarcaLanding, type ServicioLanding } from "@/lib/landing";

/** Imagen para compartir (src/app/opengraph-image.tsx). Va explícita: el segmento /en no hereda la del raíz. */
const IMAGEN_OG = "/opengraph-image";

/** Metadatos de la landing por idioma, con `hreflang` cruzado entre / y /en. */
export function metadataLanding(idioma: Idioma): Metadata {
  const m = TEXTOS[idioma].meta;
  const imagenes = [{ url: IMAGEN_OG, width: 1200, height: 630, alt: m.tituloCorto }];
  return {
    title: { absolute: m.titulo },
    description: m.descripcion,
    alternates: {
      canonical: RUTA_IDIOMA[idioma],
      languages: { "es-PE": RUTA_IDIOMA.es, en: RUTA_IDIOMA.en, "x-default": RUTA_IDIOMA.es },
    },
    openGraph: { type: "website", locale: m.locale, url: RUTA_IDIOMA[idioma], siteName: "aguemar", title: m.tituloCorto, description: m.descripcion, images: imagenes },
    twitter: { card: "summary_large_image", title: m.tituloCorto, description: m.descripcion, images: imagenes },
  };
}

/** Solo se publica un correo del dominio: el personal del responsable no sale en la landing (CLAUDE.md). */
const CORREO_DEL_DOMINIO = /@aguemar\.com$/i;

/**
 * Datos estructurados de la landing (schema.org ProfessionalService). Sin datos personales del
 * responsable ni propiedades que schema.org no define para este tipo (`inLanguage`).
 */
export function jsonLdLanding(datos: {
  idioma: Idioma;
  sitio: string;
  marca: MarcaLanding | null;
  servicios: ServicioLanding[];
  telefono: string | null;
}) {
  const t = TEXTOS[datos.idioma];
  const ruta = RUTA_IDIOMA[datos.idioma];
  const whatsapp = numeroWhatsApp(datos.telefono);
  const correo = datos.marca?.correo && CORREO_DEL_DOMINIO.test(datos.marca.correo) ? datos.marca.correo : null;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "aguemar",
    description: t.meta.descripcion,
    url: `${datos.sitio}${ruta === "/" ? "" : ruta}`,
    image: `${datos.sitio}${IMAGEN_OG}`,
    logo: `${datos.sitio}${IMAGEN_OG}`,
    areaServed: { "@type": "Country", name: datos.idioma === "es" ? "Perú" : "Peru" },
    ...(whatsapp ? { telephone: `+${whatsapp}` } : {}),
    ...(correo ? { email: correo } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t.meta.catalogo,
      itemListElement: datos.servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion ?? undefined } })),
    },
  };
}
