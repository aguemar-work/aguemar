import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileBarChart, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { textoPeriodo } from "@/lib/informe";
import { formatearFecha } from "@/lib/format";

export const metadata: Metadata = { title: "Informes" };

export default async function InformesWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, informes] = await Promise.all([ws.miEmpresa(), ws.informes()]);
  if (!moduloActivo(empresa?.modulos, "informes")) notFound();

  return (
    <>
      <PageHeader codigo="06" titulo="Informes" descripcion="Informes de avance de cada periodo: qué se hizo, en cifras, y qué sigue." />
      {informes.length === 0 ? (
        <EmptyState icono={FileBarChart} titulo="Aún no hay informes publicados." descripcion="Cuando publiquemos el informe del periodo, lo verás aquí con su PDF." />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {informes.map((i) => (
            <li key={i.id}>
              <Link href={`/w/${slug}/informes/${i.id}`} className="flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-mint-ink/40">
                <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{i.numero}</span>
                  <EtiquetaArea area={i.area} />
                </span>
                <span className="mt-1 font-medium">{i.titulo}</span>
                <span className="text-sm text-muted-foreground">{textoPeriodo(i.periodo_inicio, i.periodo_fin)}</span>
                {i.resumen ? <span className="mt-2 line-clamp-2 text-sm text-muted-foreground">{i.resumen}</span> : null}
                <span className="mt-auto flex items-center gap-3 pt-3 text-xs text-muted-foreground">
                  <span className="font-mono">{formatearFecha(i.fecha)}</span>
                  {i.comentarios ? (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden /> {i.comentarios}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
