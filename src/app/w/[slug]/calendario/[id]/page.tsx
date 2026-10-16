import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, KanbanSquare, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Hilo } from "@/components/comentarios/hilo";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { infoTipo, textoHoras } from "@/lib/calendario";
import { formatearFecha } from "@/lib/format";
import { comentarEmpresa } from "../../acciones";

export const metadata: Metadata = { title: "Actividad" };

export default async function ActividadWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, a, comentarios] = await Promise.all([ws.miEmpresa(), ws.actividad(id), ws.comentarios("actividad", id)]);
  if (!moduloActivo(empresa?.modulos, "calendario") || !a) notFound();
  const tipo = infoTipo(a.tipo);
  const esEnlace = a.lugar && /^https?:\/\//i.test(a.lugar);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/w/${slug}/calendario?mes=${a.fecha.slice(0, 7)}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Calendario
      </Link>
      <div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={`size-2 rounded-full ${tipo.punto}`} aria-hidden /> {tipo.etiqueta}
          {a.estado !== "planificada" ? <Badge variant={a.estado === "hecha" ? "ok" : "outline"}>{a.estado === "hecha" ? "Hecha" : "Cancelada"}</Badge> : null}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{a.titulo}</h1>
      </div>
      <Card>
        <CardContent className="grid gap-3 pt-5 text-sm sm:grid-cols-2">
          <p className="flex items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden /> {formatearFecha(a.fecha)}
          </p>
          {a.hora_inicio ? (
            <p className="flex items-center gap-2 font-mono">
              <Clock className="size-4 text-muted-foreground" aria-hidden /> {textoHoras(a.hora_inicio, a.hora_fin)}
            </p>
          ) : null}
          {a.lugar ? (
            <p className="flex items-center gap-2 sm:col-span-2">
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {esEnlace ? (
                <a href={a.lugar} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-4">
                  {a.lugar}
                </a>
              ) : (
                a.lugar
              )}
            </p>
          ) : null}
          {a.trabajo ? (
            <p className="flex items-center gap-2 sm:col-span-2">
              <KanbanSquare className="size-4 text-muted-foreground" aria-hidden />
              {moduloActivo(empresa?.modulos, "proyectos") ? (
                <Link href={`/w/${slug}/proyectos/${a.trabajo.id}`} className="underline-offset-4 hover:underline">
                  {a.trabajo.titulo}
                </Link>
              ) : (
                a.trabajo.titulo
              )}
            </p>
          ) : null}
          {a.descripcion ? <p className="whitespace-pre-line text-muted-foreground sm:col-span-2">{a.descripcion}</p> : null}
        </CardContent>
      </Card>
      <Hilo
        comentarios={comentarios}
        vista="empresa"
        nombrePropietario={empresa?.marca?.responsable ?? "aguemar"}
        nombreEmpresa={empresa?.nombre ?? "Tú"}
        enviar={comentarEmpresa.bind(null, slug, "actividad", id)}
        descripcion="¿Necesitas cambiar la fecha o tienes una duda? Escríbenos aquí."
      />
    </div>
  );
}
