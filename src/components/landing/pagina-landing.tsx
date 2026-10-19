import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, LogIn, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { BrilloCursor } from "@/components/landing/brillo-cursor";
import { MenuSecciones } from "@/components/landing/menu-secciones";
import { SelectorIdioma } from "@/components/landing/selector-idioma";
import { TituloSticky } from "@/components/landing/titulo-sticky";
import { Fila, ListaFilas } from "@/components/landing/fila";
import { Servicios } from "@/components/landing/servicios";
import { Proyectos } from "@/components/landing/proyectos";
import { EspacioDemo } from "@/components/landing/espacio-demo";
import { datosLanding } from "@/lib/datos/landing";
import { enlaceWhatsApp, numeroWhatsApp, serviciosPorArea, telefonoLegible } from "@/lib/landing";
import { contenidoLanding } from "@/lib/landing-contenido";
import { RUTA_IDIOMA, TEXTOS, type Idioma } from "@/lib/landing-textos";
import { envPublico } from "@/lib/env";

// El formulario (React Hook Form + Zod) se carga aparte: la landing es casi estática y así pesa menos al entrar.
const FormularioContacto = dynamic(() => import("@/components/landing/formulario-contacto").then((m) => m.FormularioContacto), {
  loading: () => <div aria-hidden className="min-h-[420px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />,
});

const SECCION = "mb-16 scroll-mt-16 lg:mb-24 lg:scroll-mt-24";
const ENLACE_LATERAL = "inline-flex items-center gap-2 rounded-sm transition-colors hover:text-mint";

/** La landing completa en un idioma: `/` la usa en español y `/en` en inglés. */
export async function PaginaLanding({ idioma }: { idioma: Idioma }) {
  const t = TEXTOS[idioma];
  const { secciones, pasos, proyectos } = contenidoLanding(idioma);
  const { marca, servicios } = await datosLanding();
  const porArea = serviciosPorArea(servicios);
  const telefono = marca?.telefono ?? envPublico.NEXT_PUBLIC_WHATSAPP ?? null;
  const whatsapp = enlaceWhatsApp(telefono, t.lateral.whatsappMensaje);
  const nombre = "aguemar";
  const anio = new Date().getFullYear();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: nombre,
    description: t.meta.descripcion,
    url: `${envPublico.NEXT_PUBLIC_SITE_URL}${RUTA_IDIOMA[idioma] === "/" ? "" : RUTA_IDIOMA[idioma]}`,
    inLanguage: t.codigo,
    logo: `${envPublico.NEXT_PUBLIC_SITE_URL}/logo.svg`,
    areaServed: { "@type": "Country", name: idioma === "es" ? "Perú" : "Peru" },
    ...(marca?.responsable ? { founder: { "@type": "Person", name: marca.responsable } } : {}),
    ...(numeroWhatsApp(telefono) ? { telephone: `+${numeroWhatsApp(telefono)}` } : {}),
    ...(marca?.correo ? { email: marca.correo } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: t.meta.catalogo,
      itemListElement: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion ?? undefined } })),
    },
  };

  return (
    // La landing es siempre oscura. En escritorio: columna izquierda fija y contenido a la derecha.
    // `lang` en el contenedor: el <html> del layout es es-PE y esta página puede estar en otro idioma.
    <div lang={t.codigo} className="dark min-h-dvh bg-ink text-white [color-scheme:dark]">
      <SaltarContenido />
      <BrilloCursor />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:px-12 md:py-16 lg:flex lg:justify-between lg:gap-4 lg:py-0">
        {/* ---------- Columna izquierda ---------- */}
        <header className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link href={RUTA_IDIOMA[idioma]} aria-label={t.inicioAria} className="inline-block rounded-md">
                <Logo variante="claro" alto={28} priority />
              </Link>
              <SelectorIdioma idioma={idioma} etiqueta={t.selectorIdioma} />
            </div>
            <p className="mt-10 font-mono text-sm text-mint">{t.hero.rotulo}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              {t.hero.h1a} <span className="text-mint">{t.hero.h1b}</span>
            </h1>
            <p className="mt-5 max-w-sm text-white/65">{t.hero.texto}</p>
            <Button asChild variant="mint" className="mt-8">
              <a href="#contacto">
                {t.hero.cta} <ArrowRight />
              </a>
            </Button>
            <MenuSecciones secciones={secciones} etiqueta={t.menuAria} />
          </div>
          <ul className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/60">
            {whatsapp ? (
              <li>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={ENLACE_LATERAL}>
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              </li>
            ) : null}
            {marca?.correo ? (
              <li>
                <a href={`mailto:${marca.correo}`} className={ENLACE_LATERAL}>
                  <Mail className="size-4" aria-hidden /> {t.lateral.correo}
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/login" className={ENLACE_LATERAL}>
                <LogIn className="size-4" aria-hidden /> {t.lateral.ingresar}
              </Link>
            </li>
          </ul>
        </header>

        {/* ---------- Columna derecha ---------- */}
        <main id="contenido" className="pt-16 lg:w-1/2 lg:py-24">
          <section id="sobre-mi" aria-labelledby="t-sobre-mi" className={SECCION}>
            <TituloSticky id="t-sobre-mi" rotulo={t.sobreMi.rotulo} titulo={t.sobreMi.titulo} />
            <div className="space-y-4 text-white/65">
              <p>{t.sobreMi.p1}</p>
              <p>{t.sobreMi.p2}</p>
            </div>
          </section>

          <Servicios porArea={porArea} t={t.servicios} idioma={idioma} />

          <section id="proyectos" aria-labelledby="t-proyectos" className={SECCION}>
            <TituloSticky id="t-proyectos" rotulo={t.proyectos.rotulo} titulo={t.proyectos.titulo} />
            <p className="mb-6 text-white/65">{t.proyectos.intro}</p>
            <Proyectos proyectos={proyectos} />
          </section>

          <section id="como-trabajo" aria-labelledby="t-como" className={SECCION}>
            <TituloSticky id="t-como" rotulo={t.comoTrabajo.rotulo} titulo={t.comoTrabajo.titulo} />
            <p className="mb-6 text-white/65">{t.comoTrabajo.intro}</p>
            <ListaFilas ordenada>
              {pasos.map((p, i) => (
                <Fila key={p.artefacto} etiqueta={String(i + 1).padStart(2, "0")} titulo={p.titulo} texto={p.texto} chips={[p.artefacto]} />
              ))}
            </ListaFilas>
          </section>

          <section id="tu-espacio" aria-labelledby="t-espacio" className={SECCION}>
            <TituloSticky id="t-espacio" rotulo={t.tuEspacio.rotulo} titulo={t.tuEspacio.titulo} />
            <p className="mb-6 text-white/65">{t.tuEspacio.intro}</p>
            <EspacioDemo t={t.demo} />
            <p className="mt-4 text-sm text-white/60">
              <span className="font-mono text-xs text-white/45">{t.tuEspacio.ejemplo}</span> {t.tuEspacio.yaTrabajas}{" "}
              <Link href="/login" className="text-white underline underline-offset-4 hover:text-mint">
                {t.tuEspacio.ingresa}
              </Link>
              .
            </p>
          </section>

          <section id="contacto" aria-labelledby="t-contacto" className="scroll-mt-16 lg:scroll-mt-24">
            <TituloSticky id="t-contacto" rotulo={t.contacto.rotulo} titulo={t.contacto.titulo} />
            <p className="mb-6 text-white/65">{t.contacto.intro}</p>
            <div className="text-foreground">
              <FormularioContacto servicios={servicios} whatsapp={whatsapp} idioma={idioma} />
            </div>
            {whatsapp || marca?.correo ? (
              <p className="mt-5 text-sm text-white/60">
                {t.contacto.directo}{" "}
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-mono text-white hover:text-mint">
                    WhatsApp {telefonoLegible(telefono)}
                  </a>
                ) : null}
                {whatsapp && marca?.correo ? t.contacto.o : null}
                {marca?.correo ? (
                  <a href={`mailto:${marca.correo}`} className="break-all font-mono text-white hover:text-mint">
                    {marca.correo}
                  </a>
                ) : null}
                .
              </p>
            ) : null}
          </section>

          <footer className="mt-16 text-xs leading-relaxed text-white/45 lg:mt-24">
            <p>
              © {anio} {nombre} · {t.pie.hecho}
            </p>
            <p className="mt-1">
              <Link href="/privacidad" className="hover:text-white">
                {t.pie.privacidad}
              </Link>{" "}
              ·{" "}
              <Link href="/login" className="hover:text-white">
                {t.pie.ingresar}
              </Link>
            </p>
          </footer>
        </main>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
