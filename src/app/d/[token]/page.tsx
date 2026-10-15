import type { Metadata } from "next";
import { CheckCircle2, FileDown, ShieldCheck, ShieldX } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { VistaFicha } from "@/components/documentos/vista-ficha";
import { VistaCotizacion } from "@/components/documentos/vista-cotizacion";
import { VistaActa, VistaBrief } from "@/components/documentos/vista-brief-acta";
import { VistaInforme } from "@/components/documentos/vista-informe";
import { NOMBRE_DOCUMENTO } from "@/lib/documentos";
import { AceptarDocumento } from "@/components/documentos/aceptar-documento";
import { portalDocumento } from "@/lib/datos/portal";
import { formatearFecha, formatearFechaHora, formatearMonto } from "@/lib/format";
import { aceptarActaPortal, aceptarCotizacionPortal } from "./acciones";
import { telefonoLegible } from "@/lib/landing";

export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const doc = await portalDocumento(token);
  if (!doc) return { title: "Enlace no válido", robots: NOINDEX };
  const marca = doc.documento.marca?.nombre_comercial ?? "agueMar";
  const titulo = `${doc.documento.numero} · ${NOMBRE_DOCUMENTO[doc.tipo]}`;
  return { title: { absolute: `${titulo} · ${marca}` }, robots: NOINDEX };
}

/** Portal público por token: ficha, brief o acta publicados, o cotización enviada. Sin login y fuera de buscadores. */
export default async function PortalDocumento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await portalDocumento(token);

  if (!doc) {
    return (
      <Marco>
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldX className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h1 className="mt-4 text-xl font-semibold">Este enlace no es válido</h1>
          <p className="mt-2 text-sm text-muted-foreground">Puede que haya sido revocado o que el documento ya no esté disponible. Pide un enlace nuevo a quien te lo envió.</p>
        </div>
      </Marco>
    );
  }

  const marca = doc.documento.marca;
  const pdf = `/d/${token}/pdf`;

  return (
    <Marco marca={marca?.nombre_comercial} contacto={[telefonoLegible(marca?.telefono), marca?.correo, marca?.web].filter(Boolean) as string[]}>
      {doc.tipo === "ficha" ? (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3 py-1 text-sm text-success-foreground">
              <ShieldCheck className="size-4" aria-hidden /> Ficha auténtica emitida por {marca?.nombre_comercial ?? "agueMar"}
            </p>
            <Botones pdf={pdf} />
          </div>
          <VistaFicha f={doc.documento} />
        </>
      ) : doc.tipo === "brief" ? (
        <>
          <div className="mb-6 flex justify-end">
            <Botones pdf={pdf} />
          </div>
          <VistaBrief b={doc.documento} />
        </>
      ) : doc.tipo === "informe" ? (
        <>
          <div className="mb-6 flex justify-end">
            <Botones pdf={pdf} />
          </div>
          <VistaInforme i={doc.documento} />
        </>
      ) : doc.tipo === "acta" ? (
        <>
          <div className="mb-6 flex justify-end">
            <Botones pdf={pdf} />
          </div>
          {!doc.documento.aceptacion ? (
            <div className="mb-8">
              <AceptarDocumento
                aceptar={aceptarActaPortal.bind(null, token)}
                contacto={doc.documento.cliente.contacto}
                titulo="Confirmar la recepción"
                descripcion="Revisa los entregables. Si todo está conforme, confirma con tu nombre y DNI."
                conformidad="Recibí los entregables listados a mi conformidad."
                boton="Confirmar recepción"
                textoExito="¡Gracias! Recepción confirmada."
              />
            </div>
          ) : null}
          <VistaActa a={doc.documento} />
        </>
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">
                COTIZACIÓN · {doc.documento.numero} · {formatearFecha(doc.documento.fecha)}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">{doc.documento.asunto}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                Para {doc.documento.cliente.nombre} <EtiquetaCotizacion estado={doc.documento.estado} />
              </p>
            </div>
            <Botones pdf={pdf} />
          </div>
          <VistaCotizacion
            c={doc.documento}
            arriba={
              doc.documento.estado === "enviada" ? (
                <AceptarDocumento
                  aceptar={aceptarCotizacionPortal.bind(null, token)}
                  total={formatearMonto(doc.documento.total, doc.documento.moneda)}
                  contacto={doc.documento.cliente.contacto}
                  textoExito="¡Gracias! Cotización aceptada. Te escribiremos para empezar."
                />
              ) : doc.documento.estado === "aceptada" && doc.documento.aceptacion ? (
                <p className="flex items-start gap-2 rounded-lg border border-border bg-success-bg p-4 text-sm text-success-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Aceptada por {doc.documento.aceptacion.nombre} el {formatearFechaHora(doc.documento.aceptacion.aceptado_en)}.
                </p>
              ) : doc.documento.estado === "vencida" ? (
                <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Esta cotización ya venció. Escríbenos y la actualizamos.</p>
              ) : null
            }
          />
        </>
      )}
    </Marco>
  );
}

function Botones({ pdf }: { pdf: string }) {
  return (
    <div className="flex gap-2">
      <Button asChild variant="mint">
        <a href={pdf} target="_blank" rel="noopener">
          <FileDown /> Ver PDF
        </a>
      </Button>
      <Button asChild variant="outline">
        <a href={`${pdf}?descargar=1`}>Descargar</a>
      </Button>
    </div>
  );
}

function Marco({ children, marca, contacto }: { children: React.ReactNode; marca?: string; contacto?: string[] }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo alto={30} className="dark:hidden" />
          <Logo variante="claro" alto={30} className="hidden dark:block" />
          <span className="font-mono text-xs text-muted-foreground">{"// documento compartido"}</span>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
      {contacto?.length ? (
        <footer className="border-t border-border">
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
            <span>{marca}</span>
            <span className="font-mono text-xs">{contacto.join(" · ")}</span>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
