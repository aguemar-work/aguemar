import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink, Package } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { Hilo } from "@/components/comentarios/hilo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ws } from "@/lib/datos/workspace";
import { TIPOS_ENTREGABLE } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { moduloActivo } from "@/lib/modulos";
import { calcularAvance } from "@/lib/trabajos-util";
import { comentarEmpresa } from "../../acciones";

export const metadata: Metadata = { title: "Proyecto" };

export default async function ProyectoWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const empresa = await ws.miEmpresa();
  if (!moduloActivo(empresa?.modulos, "proyectos")) notFound();
  const [trabajo, comentarios] = await Promise.all([ws.trabajo(id), ws.comentarios("trabajo", id)]);
  if (!trabajo) notFound();
  const avance = calcularAvance(trabajo.tareas);
  const sinEtapa = trabajo.tareas.filter((t) => !t.etapa_id || !trabajo.etapas.some((e) => e.id === t.etapa_id));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
        <Link href={`/w/${slug}/proyectos`}>
          <ArrowLeft /> Proyectos
        </Link>
      </Button>
      <PageHeader
        codigo="01"
        titulo={trabajo.titulo}
        descripcion={
          <span className="flex flex-wrap items-center gap-3">
            <EtiquetaArea area={trabajo.area} />
            <EtiquetaEstadoTrabajo estado={trabajo.estado} />
          </span>
        }
        acciones={
          avance.total > 0 ? (
            <Badge variant={avance.porcentaje === 100 ? "ok" : "outline"} className="font-mono text-sm">
              {avance.porcentaje} % · {avance.hechas}/{avance.total} tareas
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Datos</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Inicio</dt>
                  <dd>{trabajo.fecha_inicio ? formatearFecha(trabajo.fecha_inicio) : "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Fecha comprometida</dt>
                  <dd>{trabajo.fecha_compromiso ? formatearFecha(trabajo.fecha_compromiso) : "Por definir"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Entregado</dt>
                  <dd>{trabajo.fecha_entrega ? formatearFecha(trabajo.fecha_entrega) : "—"}</dd>
                </div>
                {trabajo.descripcion ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</dt>
                    <dd className="whitespace-pre-line">{trabajo.descripcion}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entregables</CardTitle>
            </CardHeader>
            <CardContent>
              {trabajo.entregables.length === 0 ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="size-4" aria-hidden /> Todavía no hay entregables.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {trabajo.entregables.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2">
                      <Badge variant="outline">{TIPOS_ENTREGABLE.find((t) => t.valor === e.tipo)?.etiqueta ?? e.tipo}</Badge>
                      <div className="min-w-0 flex-1">
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                            {e.nombre} <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : (
                          <p className="text-sm font-medium">{e.nombre}</p>
                        )}
                        {e.nota ? <p className="truncate text-xs text-muted-foreground">{e.nota}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Plan de trabajo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trabajo.etapas.length === 0 && trabajo.tareas.length === 0 ? (
                <p className="text-sm text-muted-foreground">El plan se publicará cuando esté definido.</p>
              ) : null}
              {trabajo.etapas.map((etapa, i) => {
                const tareas = trabajo.tareas.filter((t) => t.etapa_id === etapa.id);
                const av = calcularAvance(tareas);
                const hecha = etapa.hecha || (av.total > 0 && av.porcentaje === 100);
                return (
                  <section key={etapa.id} className="rounded-md border border-border">
                    <header className="flex items-center gap-2 border-b border-border bg-soft/60 px-3 py-2 dark:bg-secondary/40">
                      {hecha ? <CheckCircle2 className="size-4 text-mint-ink dark:text-mint" aria-hidden /> : <Circle className="size-4 text-muted-foreground" aria-hidden />}
                      <span className="font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className={`flex-1 text-sm font-semibold ${hecha ? "text-muted-foreground line-through" : ""}`}>{etapa.titulo}</h3>
                      <span className="font-mono text-xs text-muted-foreground">
                        {av.hechas}/{av.total}
                      </span>
                    </header>
                    <ListaTareas tareas={tareas} />
                  </section>
                );
              })}
              {sinEtapa.length > 0 ? (
                <section className="rounded-md border border-border">
                  <header className="border-b border-border bg-soft/60 px-3 py-2 text-sm font-semibold dark:bg-secondary/40">General</header>
                  <ListaTareas tareas={sinEtapa} />
                </section>
              ) : null}
            </CardContent>
          </Card>

          <Hilo
            comentarios={comentarios}
            vista="empresa"
            nombrePropietario={empresa?.marca?.responsable ?? "aguemar"}
            nombreEmpresa={empresa?.nombre ?? "Tú"}
            enviar={comentarEmpresa.bind(null, slug, "trabajo", id)}
            descripcion="Pregunta o comenta sobre este proyecto; te respondemos aquí mismo."
          />
        </div>
      </div>
    </>
  );
}

function ListaTareas({ tareas }: { tareas: { id: string; titulo: string; hecha: boolean; fecha_limite: string | null }[] }) {
  if (tareas.length === 0) return <p className="px-3 py-2 text-xs text-muted-foreground">Sin tareas.</p>;
  return (
    <ul className="space-y-1 p-3">
      {tareas.map((t) => (
        <li key={t.id} className="flex items-center gap-2 text-sm">
          {t.hecha ? <CheckCircle2 className="size-4 shrink-0 text-mint-ink dark:text-mint" aria-hidden /> : <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
          <span className={`flex-1 ${t.hecha ? "text-muted-foreground line-through" : ""}`}>{t.titulo}</span>
          {t.fecha_limite && !t.hecha ? <span className="text-xs text-muted-foreground">{formatearFecha(t.fecha_limite)}</span> : null}
        </li>
      ))}
    </ul>
  );
}
