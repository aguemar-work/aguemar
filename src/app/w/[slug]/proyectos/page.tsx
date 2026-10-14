import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ws } from "@/lib/datos/workspace";
import { formatearFecha, hoyLima } from "@/lib/format";
import { moduloActivo } from "@/lib/modulos";
import { textoVencimiento } from "@/lib/trabajos-util";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProyectosWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empresa = await ws.miEmpresa();
  if (!moduloActivo(empresa?.modulos, "proyectos")) notFound();
  const trabajos = await ws.trabajos();
  const hoy = hoyLima();

  return (
    <>
      <PageHeader codigo="01" titulo="Proyectos" descripcion="Lo que estamos haciendo para ti, con su avance y fechas." />
      {trabajos.length === 0 ? (
        <EmptyState icono={KanbanSquare} titulo="Aún no hay proyectos visibles." descripcion="Cuando se planifique un trabajo para tu empresa, aparecerá aquí." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proyecto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Entrega</TableHead>
              <TableHead className="text-right">Avance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajos.map((t) => {
              const venc = textoVencimiento(t.fecha_compromiso, hoy);
              const pct = t.tareas_total > 0 ? Math.round((t.tareas_hechas / t.tareas_total) * 100) : null;
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <EtiquetaArea area={t.area} />
                    <Link href={`/w/${slug}/proyectos/${t.id}`} className="block font-medium underline-offset-4 hover:underline">
                      {t.titulo}
                    </Link>
                    {t.comentarios > 0 ? <p className="text-xs text-muted-foreground">{t.comentarios} comentarios</p> : null}
                  </TableCell>
                  <TableCell>
                    <EtiquetaEstadoTrabajo estado={t.estado} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {t.fecha_entrega ? (
                      <>Entregado el {formatearFecha(t.fecha_entrega)}</>
                    ) : t.fecha_compromiso ? (
                      <>
                        {formatearFecha(t.fecha_compromiso)}
                        <span className={`block text-xs ${venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>{venc.texto}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Por definir</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {pct === null ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <Badge variant={pct === 100 ? "ok" : "outline"} className="font-mono">
                        {pct} %
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
