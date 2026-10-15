import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Badge } from "@/components/ui/badge";
import { ws, type WsSolicitud } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { formatearFecha, formatearFechaHora } from "@/lib/format";
import { NuevaSolicitud } from "./nueva-solicitud";

export const metadata: Metadata = { title: "Solicitudes" };

const ESTADO: Record<WsSolicitud["estado"], { texto: string; variant: "ok" | "warn" | "danger" | "outline" }> = {
  nueva: { texto: "Enviada", variant: "outline" },
  en_revision: { texto: "En revisión", variant: "warn" },
  aceptada: { texto: "Aceptada", variant: "ok" },
  rechazada: { texto: "No procede", variant: "danger" },
};

export default async function SolicitudesWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, solicitudes] = await Promise.all([ws.miEmpresa(), ws.solicitudes()]);
  if (!moduloActivo(empresa?.modulos, "solicitudes")) notFound();
  const conProyectos = moduloActivo(empresa?.modulos, "proyectos");

  return (
    <>
      <PageHeader codigo="05" titulo="Solicitudes" descripcion="Pide un trabajo y sigue en qué está tu pedido." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <NuevaSolicitud slug={slug} />
        <section aria-labelledby="t-mis">
          <h2 id="t-mis" className="mb-3 text-base font-semibold">
            Tus pedidos
          </h2>
          {solicitudes.length === 0 ? (
            <EmptyState icono={Inbox} titulo="Aún no has enviado pedidos." descripcion="Cuando envíes uno, verás aquí su estado y nuestra respuesta." className="py-10" />
          ) : (
            <ul className="space-y-2">
              {solicitudes.map((s) => {
                const e = ESTADO[s.estado];
                return (
                  <li key={s.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{s.titulo}</p>
                      <Badge variant={e.variant}>{e.texto}</Badge>
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <span className="font-mono">{formatearFechaHora(s.created_at)}</span>
                      {s.area ? <EtiquetaArea area={s.area} /> : null}
                      {s.fecha_deseada ? <span>para el {formatearFecha(s.fecha_deseada)}</span> : null}
                    </p>
                    {s.descripcion ? <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{s.descripcion}</p> : null}
                    {s.respuesta ? (
                      <p className="mt-2 rounded-md bg-soft p-2 text-sm dark:bg-secondary/50">
                        <span className="text-xs text-muted-foreground">{empresa?.marca?.responsable ?? "Respuesta"}: </span>
                        {s.respuesta}
                      </p>
                    ) : null}
                    {s.trabajo && conProyectos ? (
                      <Link href={`/w/${slug}/proyectos/${s.trabajo.id}`} className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4">
                        <KanbanSquare className="size-3.5" aria-hidden /> Ver el proyecto
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
