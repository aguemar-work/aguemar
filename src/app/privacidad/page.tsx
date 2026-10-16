import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { datosLanding } from "@/lib/datos/landing";

// Estática como la landing: los datos del responsable salen de Mi marca.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos personales trata aguemar, para qué, por cuánto tiempo y cómo ejercer tus derechos.",
  alternates: { canonical: "/privacidad" },
};

/** Última revisión del texto: cámbiala cuando edites esta página. */
const REVISADA = "16/10/2026";

function Seccion({ numero, titulo, children }: { numero: string; titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-baseline gap-3 text-lg font-semibold">
        <span className="font-mono text-sm text-mint-ink dark:text-mint">{numero}</span>
        {titulo}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">{children}</div>
    </section>
  );
}

export default async function PrivacidadPage() {
  const { marca } = await datosLanding();
  const responsable = marca?.responsable ?? "[PENDIENTE: nombre del responsable]";
  const ruc = marca?.ruc ?? "[PENDIENTE: RUC]";
  const correo = marca?.correo ?? "[PENDIENTE: correo de contacto]";
  const direccion = marca?.direccion ?? "[PENDIENTE: dirección]";

  return (
    <div className="bg-background text-foreground">
      <SaltarContenido />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Volver al inicio">
            <Logo alto={28} className="dark:hidden" />
            <Logo variante="claro" alto={28} className="hidden dark:block" />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </div>
      </header>

      <main id="contenido" className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6 sm:py-14">
        <div>
          <p className="font-mono text-xs text-mint-ink dark:text-mint">{"// legal"}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Política de privacidad</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Última revisión: <span className="font-mono">{REVISADA}</span>. Escrita en lenguaje claro según la Ley 29733 de Protección de Datos Personales del Perú
            y su reglamento.
          </p>
        </div>

        <Seccion numero="01" titulo="Quién trata tus datos">
          <p>
            <strong>{responsable}</strong> (aguemar), con RUC <span className="font-mono">{ruc}</span>, domicilio en {direccion}. Para cualquier consulta sobre
            tus datos escribe a <a href={`mailto:${correo}`} className="underline underline-offset-2">{correo}</a>.
          </p>
        </Seccion>

        <Seccion numero="02" titulo="Qué datos recojo y para qué">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Formulario de contacto y WhatsApp:</strong> nombre, empresa, teléfono, correo y tu mensaje. Los uso solo para responderte y preparar una
              cotización. También guardo la dirección IP y el navegador desde el que escribiste para evitar envíos automáticos.
            </li>
            <li>
              <strong>Tu espacio como empresa cliente:</strong> correo de acceso, nombre de contacto, RUC o DNI, teléfono y dirección, para gestionar los
              trabajos, documentos, cotizaciones y cobros que contrates.
            </li>
            <li>
              <strong>Aceptación de cotizaciones y actas:</strong> nombre y DNI de quien acepta, fecha, IP y navegador, como constancia de la aceptación.
            </li>
            <li>
              <strong>Fichas técnicas de equipos:</strong> marca, modelo, serie y estado del equipo. El diagnóstico no incluye tus archivos ni contraseñas.
            </li>
            <li>
              <strong>Correos de aviso:</strong> si tienes acceso a tu espacio, te aviso por correo cuando publico un documento o respondo un comentario. Puedes
              pedir que no te lleguen.
            </li>
          </ul>
        </Seccion>

        <Seccion numero="03" titulo="Base legal">
          <p>
            Trato tus datos porque lo pides al escribirme (consentimiento) o porque hace falta para prestarte el servicio que contrataste (ejecución del
            contrato) y cumplir obligaciones tributarias en el Perú.
          </p>
        </Seccion>

        <Seccion numero="04" titulo="Por cuánto tiempo">
          <ul className="list-disc space-y-2 pl-5">
            <li>Mensajes de contacto que no terminan en un trabajo: hasta 12 meses.</li>
            <li>Datos de clientes, cotizaciones, documentos y cobros: mientras dure la relación y el plazo que exige la normativa tributaria.</li>
            <li>Constancias de aceptación: el mismo plazo que el documento aceptado.</li>
          </ul>
        </Seccion>

        <Seccion numero="05" titulo="Con quién se comparten y dónde se guardan">
          <p>No vendo ni cedo tus datos. Solo los tratan proveedores que me prestan infraestructura, bajo sus propios contratos de confidencialidad:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>InsForge</strong> (base de datos y autenticación, servidores en Estados Unidos).
            </li>
            <li>
              <strong>Vercel</strong> (alojamiento de esta web).
            </li>
            <li>
              <strong>Resend</strong> (envío de correos de aviso).
            </li>
          </ul>
          <p>
            Esto supone una transferencia internacional de datos. Al escribirme o usar tu espacio aceptas ese flujo, que se hace con las medidas de seguridad
            descritas abajo.
          </p>
        </Seccion>

        <Seccion numero="06" titulo="Cómo los protejo">
          <p>
            Conexiones cifradas (HTTPS), acceso a la base restringido por usuario y por empresa, contraseñas cifradas, enlaces de documentos con tokens
            aleatorios que puedes pedir que revoque, y copias de seguridad del proveedor. Nadie fuera de aguemar ve los datos de otra empresa.
          </p>
        </Seccion>

        <Seccion numero="07" titulo="Tus derechos">
          <p>
            Puedes pedir acceso, rectificación, cancelación u oposición (derechos ARCO) escribiendo a{" "}
            <a href={`mailto:${correo}`} className="underline underline-offset-2">{correo}</a> con el asunto &quot;Datos personales&quot;. Respondo en un
            máximo de 10 días hábiles. Si no quedas conforme, puedes acudir a la Autoridad Nacional de Protección de Datos Personales.
          </p>
        </Seccion>

        <Seccion numero="08" titulo="Cookies">
          <p>
            Esta web no usa cookies de publicidad ni de seguimiento. Solo guarda la cookie de sesión cuando entras a tu espacio y tu preferencia de modo
            claro u oscuro.
          </p>
        </Seccion>

        <p className="text-xs text-muted-foreground">
          Si cambio esta política, actualizo la fecha de revisión al inicio de la página. [PENDIENTE: confirmar con asesoría legal e inscripción del banco de
          datos ante la ANPD si aplica.]
        </p>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-6 text-sm text-muted-foreground sm:px-6">
          <Link href="/" className="hover:text-foreground">
            Inicio
          </Link>
          <Link href="/#contacto" className="hover:text-foreground">
            Contacto
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Ingresar
          </Link>
        </div>
      </footer>
    </div>
  );
}
