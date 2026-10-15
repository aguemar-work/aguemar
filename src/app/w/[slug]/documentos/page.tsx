import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, FileText } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { formatearFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentosWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, documentos] = await Promise.all([ws.miEmpresa(), ws.documentos()]);
  if (!moduloActivo(empresa?.modulos, "documentos")) notFound();

  return (
    <>
      <PageHeader codigo="03" titulo="Documentos" descripcion="Fichas técnicas de cada servicio, con su PDF. Cada una lleva un QR para verificar que es auténtica." />
      {documentos.length === 0 ? (
        <EmptyState icono={FileText} titulo="Aún no hay documentos." descripcion="Cuando terminemos un servicio, la ficha técnica aparecerá aquí." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 p-4">
              <Link href={`/w/${slug}/documentos/${d.id}`} className="min-w-0 flex-1 hover:underline-offset-4">
                <p className="truncate font-medium hover:underline">{d.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{d.numero}</span> · {formatearFecha(d.fecha)}
                  {d.equipo ? ` · ${d.equipo}` : ""}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden sm:inline">
                  <EtiquetaFicha estado={d.estado_final} />
                </span>
                <a href={`/w/${slug}/fichas/${d.id}/pdf?descargar=1`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" aria-label={`Descargar PDF de ${d.numero}`}>
                  <FileDown className="size-4" aria-hidden /> PDF
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
