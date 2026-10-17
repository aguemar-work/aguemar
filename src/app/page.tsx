import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, LogIn, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { BrilloCursor } from "@/components/landing/brillo-cursor";
import { MenuSecciones } from "@/components/landing/menu-secciones";
import { TituloSticky } from "@/components/landing/titulo-sticky";
import { Fila, ListaFilas } from "@/components/landing/fila";
import { Servicios } from "@/components/landing/servicios";
import { Proyectos } from "@/components/landing/proyectos";
import { EspacioDemo } from "@/components/landing/espacio-demo";
import { datosLanding } from "@/lib/datos/landing";
import { enlaceWhatsApp, numeroWhatsApp, serviciosPorArea, telefonoLegible } from "@/lib/landing";
import { PASOS, SECCIONES } from "@/lib/landing-contenido";
import { envPublico } from "@/lib/env";

// El formulario (React Hook Form + Zod) se carga aparte: la landing es casi estática y así pesa menos al entrar.
const FormularioContacto = dynamic(() => import("@/components/landing/formulario-contacto").then((m) => m.FormularioContacto), {
  loading: () => <div aria-hidden className="min-h-[420px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />,
});

// Estática y regenerada cada hora; además, guardar servicios o Mi marca la regenera al instante.
export const revalidate = 3600;

const DESCRIPCION =
  "Diseño, desarrollo web y soporte técnico para empresas en Perú. Cotizaciones claras, avance a la vista en tu propio espacio y documentos verificables.";

export const metadata: Metadata = {
  title: { absolute: "aguemar · Diseño, desarrollo y soporte técnico en Perú" },
  description: DESCRIPCION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    siteName: "aguemar",
    title: "aguemar · Diseño, desarrollo y soporte técnico",
    description: DESCRIPCION,
  },
  twitter: { card: "summary_large_image", title: "aguemar · Diseño, desarrollo y soporte técnico", description: DESCRIPCION },
};

const SECCION = "mb-16 scroll-mt-16 lg:mb-24 lg:scroll-mt-24";
const ENLACE_LATERAL = "inline-flex items-center gap-2 rounded-sm transition-colors hover:text-mint";

export default async function Inicio() {
  const { marca, servicios } = await datosLanding();
  const porArea = serviciosPorArea(servicios);
  const telefono = marca?.telefono ?? envPublico.NEXT_PUBLIC_WHATSAPP ?? null;
  const whatsapp = enlaceWhatsApp(telefono, "Hola, vengo de la web de aguemar y quiero hacer una consulta.");
  const nombre = "aguemar";
  const anio = new Date().getFullYear();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: nombre,
    description: DESCRIPCION,
    url: envPublico.NEXT_PUBLIC_SITE_URL,
    logo: `${envPublico.NEXT_PUBLIC_SITE_URL}/logo.svg`,
    areaServed: { "@type": "Country", name: "Perú" },
    ...(marca?.responsable ? { founder: { "@type": "Person", name: marca.responsable } } : {}),
    ...(numeroWhatsApp(telefono) ? { telephone: `+${numeroWhatsApp(telefono)}` } : {}),
    ...(marca?.correo ? { email: marca.correo } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios",
      itemListElement: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion ?? undefined } })),
    },
  };

  return (
    // La landing es siempre oscura. En escritorio: columna izquierda fija y contenido a la derecha.
    <div className="dark min-h-dvh bg-ink text-white [color-scheme:dark]">
      <SaltarContenido />
      <BrilloCursor />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:px-12 md:py-16 lg:flex lg:justify-between lg:gap-4 lg:py-0">
        {/* ---------- Columna izquierda ---------- */}
        <header className="lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:w-1/2 lg:flex-col lg:justify-between lg:py-24">
          <div>
            <Link href="/" aria-label="aguemar, inicio" className="inline-block rounded-md">
              <Logo variante="claro" alto={28} priority />
            </Link>
            <p className="mt-10 font-mono text-sm text-mint">{"// diseño · desarrollo · soporte técnico"}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              No te pido que confíes. <span className="text-mint">Te lo muestro.</span>
            </h1>
            <p className="mt-5 max-w-sm text-white/65">
              Diseño marcas, programo webs y sistemas, y doy soporte técnico a empresas en Perú. Todo lo que hago deja evidencia que puedes revisar.
            </p>
            <Button asChild variant="mint" className="mt-8">
              <a href="#contacto">
                Cuéntame tu proyecto <ArrowRight />
              </a>
            </Button>
            <MenuSecciones secciones={SECCIONES} />
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
                  <Mail className="size-4" aria-hidden /> Correo
                </a>
              </li>
            ) : null}
            <li>
              <Link href="/login" className={ENLACE_LATERAL}>
                <LogIn className="size-4" aria-hidden /> Ingresar
              </Link>
            </li>
          </ul>
        </header>

        {/* ---------- Columna derecha ---------- */}
        <main id="contenido" className="pt-16 lg:w-1/2 lg:py-24">
          <section id="sobre-mi" aria-labelledby="t-sobre-mi" className={SECCION}>
            <TituloSticky id="t-sobre-mi" rotulo="sobre mí" titulo="Sobre mí" />
            <div className="space-y-4 text-white/65">
              <p>
                {marca?.responsable ? `Soy ${marca.responsable}. ` : ""}Hago tres cosas para empresas en Perú: diseño su identidad y sus piezas, programo sus webs y
                sistemas, y mantengo funcionando sus equipos. Tres oficios que se cruzan todo el tiempo: cómo se ve tu empresa, qué usa cada día y qué la
                sostiene.
              </p>
              <p>
                Trabajo con evidencia. Antes de empezar, una cotización por escrito que aceptas en línea. Mientras avanzo, tu empresa tiene su propio espacio
                donde ves el proyecto, el calendario y los informes cuando quieras. Al cerrar, un documento en PDF con un QR que lleva al original.
              </p>
            </div>
          </section>

          <Servicios porArea={porArea} />

          <section id="proyectos" aria-labelledby="t-proyectos" className={SECCION}>
            <TituloSticky id="t-proyectos" rotulo="proyectos" titulo="Lo que he construido" />
            <p className="mb-6 text-white/65">Proyectos propios y para clientes. Sin nombres, por discreción, pero sí qué problema había y cómo lo resolví.</p>
            <Proyectos />
          </section>

          <section id="como-trabajo" aria-labelledby="t-como" className={SECCION}>
            <TituloSticky id="t-como" rotulo="cómo trabajo" titulo="Cómo trabajo" />
            <p className="mb-6 text-white/65">Sin sorpresas: sabes qué se hará, cuánto cuesta y en qué va, en cada momento.</p>
            <ListaFilas ordenada>
              {PASOS.map((p, i) => (
                <Fila key={p.titulo} etiqueta={String(i + 1).padStart(2, "0")} titulo={p.titulo} texto={p.texto} chips={[p.artefacto]} />
              ))}
            </ListaFilas>
          </section>

          <section id="tu-espacio" aria-labelledby="t-espacio" className={SECCION}>
            <TituloSticky id="t-espacio" rotulo="tu espacio" titulo="Tu empresa, con su propio espacio" />
            <p className="mb-6 text-white/65">
              Cada empresa que atiendo entra con su usuario y ve solo lo suyo. Nada de preguntar “¿cómo vamos?” por chat: está ahí, al día. Pruébalo.
            </p>
            <EspacioDemo />
            <p className="mt-4 text-sm text-white/60">
              <span className="font-mono text-xs text-white/45">Vista de ejemplo, con datos ficticios.</span> ¿Ya trabajas conmigo?{" "}
              <Link href="/login" className="text-white underline underline-offset-4 hover:text-mint">
                Ingresa a tu espacio
              </Link>
              .
            </p>
          </section>

          <section id="contacto" aria-labelledby="t-contacto" className="scroll-mt-16 lg:scroll-mt-24">
            <TituloSticky id="t-contacto" rotulo="contacto" titulo="Conversemos" />
            <p className="mb-6 text-white/65">Cuéntame qué necesitas. Te respondo yo, no un bot, con los siguientes pasos.</p>
            <div className="text-foreground">
              <FormularioContacto servicios={servicios} whatsapp={whatsapp} />
            </div>
            {whatsapp || marca?.correo ? (
              <p className="mt-5 text-sm text-white/60">
                O directo por{" "}
                {whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="font-mono text-white hover:text-mint">
                    WhatsApp {telefonoLegible(telefono)}
                  </a>
                ) : null}
                {whatsapp && marca?.correo ? " o " : null}
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
              © {anio} {nombre} · Hecho con Next.js y Tailwind, en Perú.
            </p>
            <p className="mt-1">
              <Link href="/privacidad" className="hover:text-white">
                Privacidad
              </Link>{" "}
              ·{" "}
              <Link href="/login" className="hover:text-white">
                Ingresar
              </Link>
            </p>
          </footer>
        </main>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
