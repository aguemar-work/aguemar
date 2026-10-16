import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import { ArrowRight, Fingerprint, Mail, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { Button } from "@/components/ui/button";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { EscenaFondo } from "@/components/landing/escena/escena-fondo";
import { HoraPeru, Magnetico } from "@/components/landing/detalles";
import { Palabras, TituloSeccion } from "@/components/landing/titulo-seccion";
import { ServiciosAreas } from "@/components/landing/servicios-areas";
import { EvidenciaFicha } from "@/components/landing/evidencia-ficha";
import { EspacioDemo } from "@/components/landing/espacio-demo";
import { Proyectos } from "@/components/landing/proyectos";
import { datosLanding } from "@/lib/datos/landing";
import {
  AREAS_LANDING,
  CIFRAS_LANDING,
  FOTO_LANDING,
  enlaceWhatsApp,
  iniciales,
  numeroWhatsApp,
  serviciosPorArea,
  telefonoLegible,
} from "@/lib/landing";
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

const PASOS = [
  {
    titulo: "Conversamos",
    texto: "Me cuentas qué necesitas por WhatsApp, el formulario o una reunión. Pregunto hasta entender el problema, no solo el pedido.",
    artefacto: "// brief",
  },
  {
    titulo: "Cotización clara",
    texto: "Precio, alcance y plazo por escrito, antes de empezar. La aceptas en línea con tu nombre y DNI.",
    artefacto: "COT-AAAA-NNN · PDF",
  },
  {
    titulo: "Avance a la vista",
    texto: "Tu empresa tiene su espacio con el proyecto, el calendario y los informes. Entras cuando quieras, sin pedirme capturas.",
    artefacto: "/w/tu-empresa",
  },
  {
    titulo: "Entrega con respaldo",
    texto: "Cierro con un acta de entrega o una ficha técnica en PDF, con un QR que abre el documento original.",
    artefacto: "AE-AAAA-NNN · QR",
  },
];

const PRINCIPIOS = [
  { titulo: "Te hablo claro.", texto: "Lo técnico te lo explico en simple. Y si algo no te conviene, te lo digo antes de cotizarlo." },
  { titulo: "Lo reviso dos veces.", texto: "Nada sale sin probarse: las webs, en celular y en computadora; los equipos, con su diagnóstico antes y después." },
  { titulo: "Dejo evidencia.", texto: "Cotización por escrito, avance a la vista y un documento al cerrar. Lo que hago, lo puedes comprobar." },
];

const NAV = [
  { href: "#servicios", texto: "Servicios" },
  { href: "#evidencia", texto: "Evidencia" },
  { href: "#proyectos", texto: "Proyectos" },
  { href: "#como-trabajo", texto: "Cómo trabajo" },
  { href: "#tu-espacio", texto: "Tu espacio" },
  { href: "#contacto", texto: "Contacto" },
];

const retraso = (ms: number) => ({ "--retraso": `${ms}ms` }) as CSSProperties;

export default async function Inicio() {
  const { marca, servicios } = await datosLanding();
  const porArea = serviciosPorArea(servicios);
  const telefono = marca?.telefono ?? envPublico.NEXT_PUBLIC_WHATSAPP ?? null;
  const whatsapp = enlaceWhatsApp(telefono, "Hola, vengo de la web de aguemar y quiero hacer una consulta.");
  const nombre = "aguemar";
  const anio = new Date().getFullYear();
  const qr = await QRCode.toDataURL(`${envPublico.NEXT_PUBLIC_SITE_URL}/#evidencia`, {
    margin: 0,
    width: 160,
    color: { dark: "#0A0F1A", light: "#FFFFFF" },
  }).catch(() => null);
  const desarrollo = process.env.NODE_ENV !== "production";

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
    ...(marca?.ruc ? { taxID: marca.ruc } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios",
      itemListElement: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion ?? undefined } })),
    },
  };

  return (
    // La landing es siempre oscura: la escena 3D va de corrido detrás de todas las secciones.
    <div className="dark relative isolate min-h-dvh overflow-x-clip bg-ink text-white [color-scheme:dark]">
      <SaltarContenido />
      <EscenaFondo />
      <div aria-hidden className="grano pointer-events-none fixed inset-0 z-[1] opacity-[0.07] mix-blend-overlay" />

      <header className="cabecera-scroll sticky top-0 z-40 border-b border-white/[0.08] bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="aguemar, inicio" className="rounded-md">
            <Logo variante="claro" alto={30} priority />
          </Link>
          <nav aria-label="Secciones" className="hidden items-center gap-5 text-sm text-white/60 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-white">
                {n.texto}
              </a>
            ))}
          </nav>
          <Button asChild variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/login">Ingresar</Link>
          </Button>
        </div>
      </header>

      <div className="relative z-10">
        {/* ---------- Portada ---------- */}
        <section data-forma="corchetes" data-lado="0.47" data-escala="0.62" className="relative">
          <Brackets className="solo-sin-escena absolute -right-24 top-10 h-[30rem] w-auto opacity-[0.12] md:-right-10" color="#1CE783" />
          <div id="contenido" className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6">
            <div className="max-w-[40rem]">
              <p className="font-mono text-sm text-mint">
                <span className="escribir cursor-mono inline-block" style={retraso(100)}>
                  {"// diseño · desarrollo · soporte técnico"}
                </span>
              </p>
              <h1 className="mt-6 text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="palabras-entrada block">
                  <Palabras texto="No te pido que confíes." />
                </span>
                <span className="palabras-entrada block text-mint">
                  <Palabras texto="Te lo muestro." desde={4} />
                </span>
              </h1>
              <p className="entrada mt-7 max-w-xl text-lg text-white/70" style={retraso(650)}>
                {marca?.responsable ? `Soy ${marca.responsable}. ` : ""}Diseño marcas, programo webs y sistemas, y doy soporte técnico a empresas en Perú. Todo lo que hago deja
                evidencia: una cotización por escrito, un avance que ves cuando quieras y un documento que puedes verificar.
              </p>
              <div className="entrada mt-9 flex flex-wrap items-center gap-3" style={retraso(800)}>
                <Magnetico>
                  <Button asChild variant="mint" size="lg">
                    <a href="#contacto">
                      Cuéntame tu proyecto <ArrowRight />
                    </a>
                  </Button>
                </Magnetico>
                {whatsapp ? (
                  <Button asChild variant="outline" size="lg" className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white">
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                      <MessageCircle /> WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
              <ul className="entrada mt-10 flex flex-wrap gap-2" style={retraso(950)}>
                {AREAS_LANDING.map((a) => (
                  <li key={a.area}>
                    <a
                      href={`#${a.area}`}
                      className="inline-flex rounded-full border border-white/15 bg-ink/40 px-3 py-1 font-mono text-xs text-white/70 transition-colors hover:border-mint/60 hover:text-white"
                    >
                      {a.rotulo}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="absolute inset-x-4 bottom-6 flex items-end justify-between font-mono text-[11px] text-white/40 sm:inset-x-6">
              <span>
                Perú · <HoraPeru />
              </span>
              <a href="#servicios" className="flex items-center gap-3 transition-colors hover:text-white">
                baja y mira cómo trabajo
                <span aria-hidden className="indicador-bajar relative block h-8 w-px overflow-hidden bg-white/15">
                  <span className="absolute inset-0 bg-mint" />
                </span>
              </a>
            </div>
          </div>
        </section>

        <main>
          {/* ---------- 01 Servicios ---------- */}
          <ServiciosAreas porArea={porArea} />

          {/* ---------- 02 Evidencia ---------- */}
          <section id="evidencia" aria-labelledby="t-evidencia" data-forma="nube" data-intensidad="0.45" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
              <TituloSeccion
                n="02"
                id="t-evidencia"
                titulo="Así se ve un trabajo terminado"
                texto="Un mantenimiento real, con los datos de la empresa ocultos. Corro mi script de diagnóstico, reviso lo que encuentra, resuelvo lo que falla y te entrego una ficha que puedes verificar."
              >
                <a href="/diagnostico-agueMar.ps1" download className="revelar mt-5 inline-flex font-mono text-xs text-white/45 transition-colors hover:text-mint">
                  ↓ descarga el script · solo lee, no cambia nada
                </a>
              </TituloSeccion>
              <div className="mt-14">
                <EvidenciaFicha qr={qr} />
              </div>
            </div>
          </section>

          {/* ---------- 03 Proyectos ---------- */}
          <section id="proyectos" aria-labelledby="t-proyectos" data-forma="red" data-lado="0.45" data-escala="0.7" data-intensidad="0.3" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
              <TituloSeccion
                n="03"
                id="t-proyectos"
                titulo="Lo que he construido"
                texto="Proyectos propios y para clientes. No te muestro nombres, porque cada empresa merece discreción, pero sí qué problema había y cómo lo resolví."
              />
              <div className="mt-14">
                <Proyectos />
              </div>
            </div>
          </section>

          {/* ---------- 04 Cómo trabajo ---------- */}
          <section id="como-trabajo" aria-labelledby="t-como" data-forma="linea" data-lado="0.5" data-escala="0.85" data-intensidad="0.9" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
              <div className="max-w-xl">
                <TituloSeccion n="04" id="t-como" titulo="Cómo trabajo" texto="Sin sorpresas: sabes qué se hará, cuánto cuesta y en qué va, en cada momento." />
                <ol className="relative mt-14">
                  <span aria-hidden className="absolute bottom-6 left-5 top-5 w-px -translate-x-1/2 bg-white/10">
                    <span className="trazo-scroll block h-full w-full bg-mint" />
                  </span>
                  {PASOS.map((p, i) => (
                    <li key={p.titulo} className="revelar relative grid grid-cols-[2.5rem_1fr] gap-5 pb-12 last:pb-0">
                      <span className="relative flex size-10 items-center justify-center rounded-full border border-mint/40 bg-ink font-mono text-sm text-mint">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="pt-1.5">
                        <h3 className="text-xl font-semibold">{p.titulo}</h3>
                        <p className="mt-2 text-white/65">{p.texto}</p>
                        <span className="mt-3 inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/55">{p.artefacto}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          {/* ---------- 05 Tu espacio ---------- */}
          <section id="tu-espacio" aria-labelledby="t-espacio" data-forma="plano" data-intensidad="0.5" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-36">
              <TituloSeccion
                n="05"
                id="t-espacio"
                titulo="Tu empresa, con su propio espacio"
                texto="Cada empresa que atiendo entra con su usuario y ve solo lo suyo. Nada de preguntar “¿cómo vamos?” por chat: está ahí, al día. Pruébalo."
              />
              <div className="mt-12">
                <EspacioDemo />
              </div>
              <div className="mt-5 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="font-mono text-xs text-white/40">Vista de ejemplo, con datos ficticios.</p>
                <p className="text-white/60">
                  ¿Ya trabajas conmigo?{" "}
                  <Link href="/login" className="font-medium text-white underline underline-offset-4 hover:text-mint">
                    Ingresa a tu espacio
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* ---------- 06 Quién está detrás ---------- */}
          <section id="quien" aria-labelledby="t-quien" data-forma="huella" data-lado="0.5" data-escala="0.95" className="scroll-mt-20">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:py-36 lg:grid-cols-2">
              <div>
                <TituloSeccion n="06" id="t-quien" titulo="Quién está detrás" texto="Detrás de aguemar hay una persona, no una plantilla." />
                <div className="revelar mt-10 flex items-center gap-4">
                  {FOTO_LANDING ? (
                    <Image src={FOTO_LANDING} alt={marca?.responsable ?? "Responsable de aguemar"} width={64} height={64} className="size-16 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden className="flex size-16 items-center justify-center rounded-full border border-mint/40 bg-mint/10 font-mono text-lg font-semibold text-mint">
                      {iniciales(marca?.responsable)}
                    </span>
                  )}
                  <div>
                    <p className="font-semibold">{marca?.responsable ?? "aguemar"}</p>
                    {marca?.cargo ? <p className="text-sm text-white/55">{marca.cargo}</p> : null}
                    {desarrollo && !FOTO_LANDING ? <p className="font-mono text-[11px] text-[#f2c35b]">[PENDIENTE: foto en FOTO_LANDING]</p> : null}
                  </div>
                </div>
                <p className="revelar mt-6 max-w-lg text-white/70">
                  aguemar es mi marca y mi forma de trabajar: diseño, programo y reviso equipos con la misma regla. Si lleva mi nombre, tiene que estar bien hecho.
                </p>
                <ol className="mt-8 space-y-6">
                  {PRINCIPIOS.map((p, i) => (
                    <li key={p.titulo} className="revelar grid grid-cols-[2.5rem_1fr] gap-2">
                      <span className="pt-1 font-mono text-xs text-mint">{String(i + 1).padStart(2, "0")}</span>
                      <p className="text-white/65">
                        <span className="font-semibold text-white">{p.titulo}</span> {p.texto}
                      </p>
                    </li>
                  ))}
                </ol>
                {CIFRAS_LANDING.length ? (
                  <dl className="revelar mt-10 grid grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
                    {CIFRAS_LANDING.map((c) => (
                      <div key={c.texto} className="flex flex-col">
                        <dt className="order-2 text-sm text-white/55">{c.texto}</dt>
                        <dd className="font-mono text-3xl font-semibold text-mint">{c.valor}</dd>
                      </div>
                    ))}
                  </dl>
                ) : desarrollo ? (
                  <p className="mt-10 rounded-lg border border-dashed border-[#f2c35b]/40 p-3 font-mono text-[11px] text-[#f2c35b]">
                    [PENDIENTE: cifras reales en CIFRAS_LANDING: años, empresas atendidas, equipos revisados…] Solo se ve en desarrollo.
                  </p>
                ) : null}
              </div>
              {/* Espacio para la huella 3D; sin escena, un ícono hace de respaldo. */}
              <div aria-hidden className="hidden items-center justify-center lg:flex">
                <Fingerprint className="solo-sin-escena size-64 text-mint/15" strokeWidth={0.75} />
              </div>
            </div>
          </section>

          {/* ---------- 07 Contacto ---------- */}
          <section id="contacto" aria-labelledby="t-contacto" data-forma="corchetes" data-escala="1.25" data-intensidad="0.3" className="scroll-mt-20">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:py-36 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <TituloSeccion n="07" id="t-contacto" titulo="Conversemos" texto="Cuéntame qué necesitas. Te respondo yo, no un bot, con los siguientes pasos." />
                <ul className="revelar mt-10 space-y-3">
                  {whatsapp ? (
                    <li>
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-ink/50 p-4 backdrop-blur transition-colors hover:border-mint/50"
                      >
                        <MessageCircle className="size-5 text-mint" aria-hidden />
                        <span className="flex-1">
                          <span className="block text-sm text-white/55">WhatsApp</span>
                          <span className="font-mono">{telefonoLegible(telefono)}</span>
                        </span>
                        <ArrowRight className="size-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-mint" aria-hidden />
                      </a>
                    </li>
                  ) : null}
                  {marca?.correo ? (
                    <li>
                      <a
                        href={`mailto:${marca.correo}`}
                        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-ink/50 p-4 backdrop-blur transition-colors hover:border-mint/50"
                      >
                        <Mail className="size-5 text-mint" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-white/55">Correo</span>
                          <span className="break-all font-mono text-sm">{marca.correo}</span>
                        </span>
                        <ArrowRight className="size-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-mint" aria-hidden />
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="revelar text-foreground">
                <FormularioContacto servicios={servicios} whatsapp={whatsapp} />
              </div>
            </div>
          </section>
        </main>

        <footer className="relative overflow-hidden border-t border-white/10">
          <p aria-hidden className="pointer-events-none select-none whitespace-nowrap px-4 pt-10 text-center font-mono text-[13vw] font-semibold leading-none tracking-tighter text-white/[0.04] sm:px-6">
            {"<aguemar/>"}
          </p>
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <Logo variante="claro" alto={24} />
              <span>
                © {anio} {nombre}
                {marca?.ruc ? <span className="font-mono"> · RUC {marca.ruc}</span> : null}
              </span>
            </div>
            <nav aria-label="Pie" className="flex flex-wrap gap-4">
              <a href="#servicios" className="hover:text-white">
                Servicios
              </a>
              <a href="#contacto" className="hover:text-white">
                Contacto
              </a>
              <Link href="/privacidad" className="hover:text-white">
                Privacidad
              </Link>
              <Link href="/login" className="hover:text-white">
                Ingresar
              </Link>
            </nav>
          </div>
        </footer>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
