import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, FileText, Wallet, FileSignature } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerTrabajo, planTrabajo } from "@/lib/datos/trabajos";
import { PRIORIDADES } from "@/lib/areas";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";
import { textoVencimiento } from "@/lib/trabajos-util";
import { eliminarTrabajo } from "../acciones";
import { CambiarEstado } from "./cambiar-estado";
import { Plan } from "./plan";
import { Entregables } from "./entregables";

export const metadata: Metadata = { title: "Trabajo" };

export default async function TrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trabajo = await obtenerTrabajo(id);
  if (!trabajo) notFound();
  const plan = await planTrabajo(id);
  const hoy = hoyLima();
  const venc = textoVencimiento(trabajo.fecha_compromiso, hoy);
  const prioridad = PRIORIDADES.find((p) => p.valor === trabajo.prioridad)?.etiqueta ?? trabajo.prioridad;

  const datos: [string, React.ReactNode][] = [
    [
      "Cliente",
      trabajo.clientes ? (
        <Link href={`/panel/clientes/${trabajo.clientes.id}`} className="underline-offset-4 hover:underline">
          {trabajo.clientes.nombre}
        </Link>
      ) : (
        <span className="text-muted-foreground">Sin cliente</span>
      ),
    ],
    ["Prioridad", <Badge key="p" variant={trabajo.prioridad === "alta" ? "danger" : trabajo.prioridad === "media" ? "warn" : "outline"}>{prioridad}</Badge>],
    ["Inicio", trabajo.fecha_inicio ? formatearFecha(trabajo.fecha_inicio) : "—"],
    [
      "Fecha comprometida",
      trabajo.fecha_compromiso ? (
        <>
          {formatearFecha(trabajo.fecha_compromiso)}
          {trabajo.estado === "en_curso" || trabajo.estado === "en_revision" || trabajo.estado === "propuesta" ? (
            <span className={`ml-2 text-xs ${venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>{venc.texto}</span>
          ) : null}
        </>
      ) : (
        "—"
      ),
    ],
    ["Entregado", trabajo.fecha_entrega ? formatearFecha(trabajo.fecha_entrega) : "—"],
    ["Monto estimado", trabajo.monto_estimado != null ? <span className="font-mono">{formatearMonto(trabajo.monto_estimado, trabajo.moneda)}</span> : "—"],
  ];

  return (
    <>
      <PageHeader
        codigo="04"
        titulo={trabajo.titulo}
        descripcion={<EtiquetaArea area={trabajo.area} />}
        acciones={
          <>
            <CambiarEstado id={id} estado={trabajo.estado} />
            <Button asChild variant="outline">
              <Link href={`/panel/trabajos/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
            <ConfirmarEliminar
              titulo={`¿Eliminar "${trabajo.titulo}"?`}
              descripcion="Se eliminan sus etapas, tareas y entregables. Las cotizaciones y documentos vinculados quedan sin trabajo."
              accion={eliminarTrabajo.bind(null, id)}
              irA="/panel/trabajos"
              textoExito="Trabajo eliminado."
            />
          </>
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
                {datos.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
                {trabajo.descripcion ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Descripción</dt>
                    <dd className="whitespace-pre-line">{trabajo.descripcion}</dd>
                  </div>
                ) : null}
                {trabajo.notas ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Notas internas</dt>
                    <dd className="whitespace-pre-line">{trabajo.notas}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dinero y documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <FileText className="size-4" aria-hidden /> Cotizaciones: en la Fase 4.
              </p>
              <p className="flex items-center gap-2">
                <Wallet className="size-4" aria-hidden /> Cobros y saldo: en la Fase 4.
              </p>
              <p className="flex items-center gap-2">
                <FileSignature className="size-4" aria-hidden /> Brief, acta o ficha técnica: en la Fase 5.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Plan trabajoId={id} etapas={plan.etapas} tareas={plan.tareas} hoy={hoy} />
          <Entregables trabajoId={id} entregables={plan.entregables} />
        </div>
      </div>
    </>
  );
}
