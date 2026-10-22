import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileDown, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { textoAceptacion } from "@/lib/cotizacion";
import { formatearFechaHora, formatearMonto } from "@/lib/format";
import { AceptarDocumento } from "@/components/documentos/aceptar-documento";
import { VistaCotizacion } from "@/components/documentos/vista-cotizacion";
import { Hilo } from "@/components/comentarios/hilo";
import { aceptarCotizacionEmpresa, comentarEmpresa } from "../../acciones";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, c, comentarios] = await Promise.all([ws.miEmpresa(), ws.cotizacion(id), ws.comentarios("cotizacion", id)]);
  if (!moduloActivo(empresa?.modulos, "cotizaciones") || !c) notFound();
  return (
    <>
      <Link href={`/w/${slug}/cotizaciones`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Cotizaciones
      </Link>
      <PageHeader
        titulo={c.asunto}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.numero}</span> · <EtiquetaArea area={c.area} /> <EtiquetaCotizacion estado={c.estado} />
          </span>
        }
        acciones={
          <>
            <Button asChild variant="outline">
              <a href={`/w/${slug}/cotizaciones/${c.id}/pdf`} target="_blank" rel="noopener">
                <FileDown /> Ver PDF
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/w/${slug}/cotizaciones/${c.id}/pdf?descargar=1`}>Descargar</a>
            </Button>
          </>
        }
      />

      <VistaCotizacion
        c={c}
        arriba={
          <>
                {c.estado === "enviada" ? <AceptarDocumento aceptar={aceptarCotizacionEmpresa.bind(null, slug, c.id)} total={formatearMonto(c.total, c.moneda)} contacto={empresa?.contacto ?? null} /> : null}

                {c.estado === "aceptada" && c.aceptacion ? (
                  <p className="flex items-start gap-2 rounded-lg border border-border bg-success-bg p-4 text-sm text-success-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {textoAceptacion(c.aceptacion, formatearFechaHora(c.aceptacion.aceptado_en))}.
                      {c.trabajo_id && moduloActivo(empresa?.modulos, "proyectos") ? (
                        <>
                          {" "}
                          <Link href={`/w/${slug}/proyectos/${c.trabajo_id}`} className="inline-flex items-center gap-1 font-medium underline underline-offset-4">
                            <KanbanSquare className="size-3.5" aria-hidden /> Ver el proyecto
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </p>
                ) : null}
          </>
        }
      />

      <div className="mt-6">
        <Hilo
          comentarios={comentarios}
          vista="empresa"
          nombrePropietario={empresa?.marca?.responsable ?? "aguemar"}
          nombreEmpresa={empresa?.nombre ?? "Tú"}
          enviar={comentarEmpresa.bind(null, slug, "cotizacion", c.id)}
          titulo="¿Tienes dudas?"
          descripcion="Escríbenos lo que quieras aclarar antes de aceptar; te respondemos aquí mismo."
        />
      </div>
    </>
  );
}
