import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  CalendarDays,
  FileBarChart,
  FileCheck2,
  Inbox,
  KanbanSquare,
  Mail,
  MessageCircle,
  Receipt,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { Button } from "@/components/ui/button";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { MuestraEspacio } from "@/components/landing/muestra-espacio";
import { datosLanding } from "@/lib/datos/landing";
import { AREAS_LANDING, enlaceWhatsApp, numeroWhatsApp, serviciosPorArea, telefonoLegible, textoPrecio } from "@/lib/landing";
import { envPublico } from "@/lib/env";

// El formulario (React Hook Form + Zod) se carga aparte: la landing es casi estática y así pesa menos al entrar.
const FormularioContacto = dynamic(() => import("@/components/landing/formulario-contacto").then((m) => m.FormularioContacto), {
  loading: () => <div aria-hidden className="min-h-[420px] animate-pulse rounded-2xl border border-border bg-soft" />,
});

// Estática y regenerada cada hora; además, guardar servicios o Mi marca la regenera al instante.
export const revalidate = 3600;

const DESCRIPCION =
  "Diseño, desarrollo web y soporte técnico para empresas en Perú. Cotizaciones claras, avance a la vista en tu propio espacio y documentos verificables.";

export const metadata: Metadata = {
  title: { absolute: "agueMar · Diseño, desarrollo y soporte técnico en Perú" },
  description: DESCRIPCION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "/",
    siteName: "agueMar",
    title: "agueMar · Diseño, desarrollo y soporte técnico",
    description: DESCRIPCION,
  },
  twitter: { card: "summary_large_image", title: "agueMar · Diseño, desarrollo y soporte técnico", description: DESCRIPCION },
};

const PASOS = [
  { titulo: "Conversamos", texto: "Me cuentas qué necesitas por WhatsApp, el formulario o una reunión. Revisamos juntos el alcance." },
  { titulo: "Cotización clara", texto: "Recibes precio, alcance y plazo por escrito. La aceptas en línea con tu nombre y DNI." },
  { titulo: "Avance a la vista", texto: "Tu empresa tiene su propio espacio con el proyecto, el calendario y los informes del periodo." },
  { titulo: "Entrega con respaldo", texto: "Cierras con un acta de entrega o una ficha técnica en PDF, verificable con su código QR." },
];

const ESPACIO = [
  { icono: KanbanSquare, titulo: "Proyectos", texto: "Etapas, tareas y entregables con su avance." },
  { icono: CalendarDays, titulo: "Calendario", texto: "Reuniones, publicaciones, mantenimientos y entregas." },
  { icono: FileBarChart, titulo: "Informes", texto: "Qué se hizo en el periodo, en cifras, con PDF." },
  { icono: FileCheck2, titulo: "Documentos", texto: "Fichas técnicas, briefs y actas verificables." },
  { icono: Receipt, titulo: "Cotizaciones y cobros", texto: "Acepta en línea y revisa tu saldo." },
  { icono: Inbox, titulo: "Solicitudes", texto: "Pide un trabajo nuevo y sigue su estado." },
];

export default async function Inicio() {
  const { marca, servicios } = await datosLanding();
  const porArea = serviciosPorArea(servicios);
  const telefono = marca?.telefono ?? envPublico.NEXT_PUBLIC_WHATSAPP ?? null;
  const whatsapp = enlaceWhatsApp(telefono, "Hola, vengo de la web de agueMar y quiero hacer una consulta.");
  const nombre = "agueMar";
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
    ...(marca?.ruc ? { taxID: marca.ruc } : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Servicios",
      itemListElement: servicios.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.nombre, description: s.descripcion ?? undefined } })),
    },
  };

  return (
    <div className="bg-background text-foreground">
      <SaltarContenido />

      {/* ---------- Portada ---------- */}
      <section className="relative overflow-hidden bg-ink text-white">
        <Brackets className="absolute -right-24 -top-10 h-[30rem] w-auto opacity-[0.12] md:-right-10" color="#1CE783" />
        <header className="relative mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="agueMar, inicio" className="rounded-md">
            <Logo variante="claro" alto={32} priority />
          </Link>
          <nav aria-label="Secciones" className="hidden items-center gap-6 text-sm text-white/70 md:flex">
            <a href="#servicios" className="hover:text-white">
              Servicios
            </a>
            <a href="#como-trabajo" className="hover:text-white">
              Cómo trabajo
            </a>
            <a href="#tu-espacio" className="hover:text-white">
              Tu espacio
            </a>
            <a href="#contacto" className="hover:text-white">
              Contacto
            </a>
          </nav>
          <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <Link href="/login">Ingresar</Link>
          </Button>
        </header>

        <div id="contenido" className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28">
          <div>
            <p className="font-mono text-sm text-mint">{"// diseño · desarrollo · soporte técnico"}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Tu marca, tu web y tus equipos, en buenas manos.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              {marca?.responsable ? `Soy ${marca.responsable}. ` : ""}Diseño, desarrollo y doy soporte técnico a empresas en Perú. Cada empresa sigue su avance en su propio espacio:
              proyectos, informes y documentos al día.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="mint" size="lg">
                <a href="#contacto">
                  Cuéntame tu proyecto <ArrowRight />
                </a>
              </Button>
              {whatsapp ? (
                <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <MessageCircle /> WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
            <ul className="mt-10 flex flex-wrap gap-2">
              {AREAS_LANDING.map((a) => (
                <li key={a.area}>
                  <a href={`#${a.area}`} className="inline-flex rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/70 hover:border-mint/60 hover:text-white">
                    {a.rotulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <MuestraEspacio />
        </div>
      </section>

      <main>
        {/* ---------- Servicios ---------- */}
        <section id="servicios" aria-labelledby="t-servicios" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 md:py-28">
          <Titulo n="01" id="t-servicios" titulo="Servicios" texto="Tres áreas que se complementan: lo que tu empresa muestra, lo que usa y lo que la mantiene funcionando." />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {AREAS_LANDING.map((a) => {
              const lista = porArea[a.area];
              return (
                <article key={a.area} id={a.area} className="flex scroll-mt-6 flex-col rounded-xl border border-border bg-card p-6">
                  <p className="font-mono text-xs text-mint-ink dark:text-mint">{a.rotulo}</p>
                  <h3 className="mt-2 text-xl font-semibold">{a.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{a.texto}</p>
                  {lista.length ? (
                    <ul className="mt-5 space-y-3 border-t border-border pt-5">
                      {lista.map((s) => {
                        const precio = textoPrecio(s);
                        return (
                          <li key={s.id}>
                            <p className="flex gap-2 font-medium">
                              <span className="font-mono text-mint-ink dark:text-mint">›</span>
                              {s.nombre}
                            </p>
                            {s.descripcion ? <p className="ml-4 text-sm text-muted-foreground">{s.descripcion}</p> : null}
                            {precio ? <p className="ml-4 font-mono text-xs text-muted-foreground">{precio}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">Proyectos a medida según lo que necesites.</p>
                  )}
                  <a href="#contacto" className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-mint-ink underline-offset-4 hover:underline dark:text-mint">
                    Consultar <ArrowRight className="size-4" aria-hidden />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* ---------- Cómo trabajo ---------- */}
        <section id="como-trabajo" aria-labelledby="t-como" className="scroll-mt-6 border-y border-border bg-soft dark:bg-secondary/30">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
            <Titulo n="02" id="t-como" titulo="Cómo trabajo" texto="Sin sorpresas: sabes qué se hará, cuánto cuesta y en qué va." />
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {PASOS.map((p, i) => (
                <li key={p.titulo} className="relative rounded-xl border border-border bg-card p-6">
                  <span className="font-mono text-3xl font-semibold text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-semibold">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Tu espacio ---------- */}
        <section id="tu-espacio" aria-labelledby="t-espacio" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20 sm:px-6 md:py-28">
          <Titulo
            n="03"
            id="t-espacio"
            titulo="Tu empresa, con su propio espacio"
            texto="Cada empresa que atiendo entra con su usuario y ve solo lo suyo: lo que necesita, sin pedir actualizaciones por chat."
          />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ESPACIO.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4 rounded-xl border border-border p-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-mint-soft text-mint-ink dark:bg-mint/15 dark:text-mint">
                  <Icono className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{titulo}</span>
                  <span className="text-sm text-muted-foreground">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            ¿Ya trabajas conmigo?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Ingresa a tu espacio
            </Link>
            .
          </p>
        </section>

        {/* ---------- Contacto ---------- */}
        <section id="contacto" aria-labelledby="t-contacto" className="relative scroll-mt-6 overflow-hidden bg-ink text-white">
          <Brackets className="absolute -bottom-24 -left-24 h-96 w-auto opacity-[0.08]" color="#1CE783" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:py-28 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="font-mono text-sm text-mint">04</p>
              <h2 id="t-contacto" className="mt-2 text-3xl font-semibold sm:text-4xl">
                Conversemos
              </h2>
              <p className="mt-3 max-w-md text-white/70">Cuéntame qué necesitas y te respondo con los siguientes pasos. Si prefieres, escríbeme directo.</p>
              <ul className="mt-8 space-y-3">
                {whatsapp ? (
                  <li>
                    <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:border-mint/50">
                      <MessageCircle className="size-5 text-mint" aria-hidden />
                      <span>
                        <span className="block text-sm text-white/60">WhatsApp</span>
                        <span className="font-mono">{telefonoLegible(telefono)}</span>
                      </span>
                    </a>
                  </li>
                ) : null}
                {marca?.correo ? (
                  <li>
                    <a href={`mailto:${marca.correo}`} className="flex items-center gap-3 rounded-xl border border-white/10 p-4 hover:border-mint/50">
                      <Mail className="size-5 text-mint" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-sm text-white/60">Correo</span>
                        <span className="break-all font-mono text-sm">{marca.correo}</span>
                      </span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
            <div className="text-foreground">
              <FormularioContacto servicios={servicios} whatsapp={whatsapp} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo alto={24} className="dark:hidden" />
            <Logo variante="claro" alto={24} className="hidden dark:block" />
            <span>
              © {anio} {nombre}
              {marca?.ruc ? <span className="font-mono"> · RUC {marca.ruc}</span> : null}
            </span>
          </div>
          <nav aria-label="Pie" className="flex gap-4">
            <a href="#servicios" className="hover:text-foreground">
              Servicios
            </a>
            <a href="#contacto" className="hover:text-foreground">
              Contacto
            </a>
            <Link href="/privacidad" className="hover:text-foreground">
              Privacidad
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Ingresar
            </Link>
          </nav>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}

function Titulo({ n, id, titulo, texto }: { n: string; id: string; titulo: string; texto: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-sm text-mint-ink dark:text-mint">{n}</p>
      <h2 id={id} className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {titulo}
      </h2>
      <p className="mt-3 text-muted-foreground">{texto}</p>
    </div>
  );
}
