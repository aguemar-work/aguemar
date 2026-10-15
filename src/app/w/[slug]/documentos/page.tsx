import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, FileText } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { Badge } from "@/components/ui/badge";
import { ws, type WsDocumento } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { NOMBRE_DOCUMENTO } from "@/lib/documentos";
import { formatearFecha } from "@/lib/format";
import type { EstadoFinalFicha } from "@/types/database";

export const metadata: Metadata = { title: "Documentos" };

/** Ruta del detalle y del PDF de cada tipo dentro del workspace. */
function rutas(slug: string, d: WsDocumento) {
  if (d.tipo === "ficha") return { ver: `/w/${slug}/documentos/${d.id}`, pdf: `/w/${slug}/fichas/${d.id}/pdf` };
  if (d.tipo === "brief") return { ver: `/w/${slug}/documentos/brief/${d.id}`, pdf: `/w/${slug}/briefs/${d.id}/pdf` };
  return { ver: `/w/${slug}/documentos/acta/${d.id}`, pdf: `/w/${slug}/actas/${d.id}/pdf` };
}

export default async function DocumentosWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, documentos] = await Promise.all([ws.miEmpresa(), ws.documentos()]);
  if (!moduloActivo(empresa?.modulos, "documentos")) notFound();
  const porAceptar = documentos.filter((d) => d.tipo === "acta" && d.estado === "por_aceptar");

  return (
    <>
      <PageHeader codigo="03" titulo="Documentos" descripcion="Fichas técnicas de cada servicio, briefs de los proyectos y actas de entrega, con su PDF." />
      {porAceptar.length ? (
        <p className="mb-4 rounded-lg border border-mint-ink/30 bg-success-bg px-4 py-3 text-sm text-success-foreground">
          Tienes {porAceptar.length === 1 ? "un acta de entrega por confirmar" : `${porAceptar.length} actas de entrega por confirmar`}. Ábrela, revisa los entregables y confírmala.
        </p>
      ) : null}
      {documentos.length === 0 ? (
        <EmptyState icono={FileText} titulo="Aún no hay documentos." descripcion="Cuando terminemos un servicio o empecemos un proyecto, sus documentos aparecerán aquí." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documentos.map((d) => {
            const r = rutas(slug, d);
            return (
              <li key={`${d.tipo}-${d.id}`} className="flex items-center justify-between gap-3 p-4">
                <Link href={r.ver} className="min-w-0 flex-1">
                  <p className="truncate font-medium hover:underline">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {NOMBRE_DOCUMENTO[d.tipo]} · <span className="font-mono">{d.numero}</span> · {formatearFecha(d.fecha)}
                    {d.detalle ? ` · ${d.detalle}` : ""}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden sm:inline">
                    {d.tipo === "ficha" && d.estado ? <EtiquetaFicha estado={d.estado as EstadoFinalFicha} /> : null}
                    {d.tipo === "acta" ? <Badge variant={d.estado === "aceptada" ? "ok" : "warn"}>{d.estado === "aceptada" ? "Confirmada" : "Por confirmar"}</Badge> : null}
                  </span>
                  <a href={`${r.pdf}?descargar=1`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" aria-label={`Descargar PDF de ${d.numero}`}>
                    <FileDown className="size-4" aria-hidden /> PDF
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
