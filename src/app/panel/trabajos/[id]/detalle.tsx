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
import { VisibilidadTrabajo } from "./visibilidad";
import { Hilo } from "@/components/comentarios/hilo";
import { comentariosDe } from "@/lib/datos/comentarios";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { comentarPropietario } from "@/app/panel/bandeja/acciones";
import { cotizacionDeTrabajo } from "@/lib/datos/cotizaciones";
import { obtenerRol } from "@/lib/insforge/server";

/** Detalle de un trabajo. Se usa en la página completa y en el panel lateral (@modal). */
export async function DetalleTrabajo({ id }: { id: string }) {
  // Todo en paralelo: una sola espera a InsForge.
  const [trabajo, plan, comentarios, marca, cotizacion, rol] = await Promise.all([
    obtenerTrabajo(id),
    planTrabajo(id),
    comentariosDe("trabajo", id),
    obtenerPerfilMarca(),
    cotizacionDeTrabajo(id),
    obtenerRol(),
  ]);
  // El colaborador ve el plan, entregables y comentarios; no edita el trabajo ni ve dinero.
  const propietario = rol.tipo === "propietario";
  if (!trabajo) notFound();
  const hoy = hoyLima();
  const venc = textoVencimiento(trabajo.fecha_compromiso, hoy);
  const prioridad = PRIORIDADES.find((p) => p.valor === trabajo.prioridad)?.etiqueta ?? trabajo.prioridad;

  const datos: [string, React.ReactNode][] = [
    [
      "Empresa",
      trabajo.clientes ? (
        propietario ? (
          <Link href={`/panel/clientes/${trabajo.clientes.id}`} className="underline-offset-4 hover:underline">
            {trabajo.clientes.nombre}
          </Link>
        ) : (
          trabajo.clientes.nombre
        )
      ) : (
        <span className="text-muted-foreground">Sin empresa</span>
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
    ...(propietario
      ? ([["Monto estimado", trabajo.monto_estimado != null ? <span className="font-mono">{formatearMonto(trabajo.monto_estimado, trabajo.moneda)}</span> : "—"]] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <>
      <PageHeader
        codigo="04"
        titulo={trabajo.titulo}
        descripcion={<EtiquetaArea area={trabajo.area} />}
        acciones={
          propietario ? (
          <>
            <VisibilidadTrabajo id={id} visible={trabajo.visible_empresa} tieneEmpresa={Boolean(trabajo.cliente_id)} />
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
          ) : null
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
              <CardTitle>{propietario ? "Dinero y documentos" : "Documentos"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {!propietario ? null : cotizacion ? (
                <>
                  <Link href={`/panel/cotizaciones/${cotizacion.id}`} className="flex items-center gap-2 text-foreground underline-offset-4 hover:underline">
                    <FileText className="size-4" aria-hidden /> Viene de <span className="font-mono">{cotizacion.numero}</span> · {formatearMonto(cotizacion.total, cotizacion.moneda)}
                  </Link>
                  <p className="flex items-center gap-2">
                    <Wallet className="size-4" aria-hidden /> Cobrado {formatearMonto(cotizacion.cobrado, cotizacion.moneda)}
                    {cotizacion.total > cotizacion.cobrado ? <span className="text-warn dark:text-warning-foreground">· saldo {formatearMonto(cotizacion.total - cotizacion.cobrado, cotizacion.moneda)}</span> : <span className="text-mint-ink dark:text-mint">· pagado</span>}
                  </p>
                </>
              ) : (
                <Link
                  href={trabajo.cliente_id ? `/panel/cotizaciones/nueva?cliente=${trabajo.cliente_id}` : "/panel/cotizaciones/nueva"}
                  className="flex items-center gap-2 underline-offset-4 hover:underline"
                >
                  <FileText className="size-4" aria-hidden /> Sin cotización. Crear una
                </Link>
              )}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <FileSignature className="size-4" aria-hidden />
                <span>Crear:</span>
                {[
                  ["Brief", "/panel/briefs/nuevo"],
                  ["Acta de entrega", "/panel/actas/nueva"],
                  ["Ficha técnica", "/panel/fichas/nueva"],
                  ["Actividad", "/panel/calendario/nueva"],
                  ["Informe", "/panel/informes/nuevo"],
                ].map(([texto, ruta]) => (
                  <Link
                    key={ruta}
                    href={`${ruta}?trabajo=${id}${trabajo.cliente_id ? `&cliente=${trabajo.cliente_id}` : ""}`}
                    className="text-foreground underline-offset-4 hover:underline"
                  >
                    {texto}
                  </Link>
                ))}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Plan trabajoId={id} etapas={plan.etapas} tareas={plan.tareas} hoy={hoy} gestionaEtapas={propietario} />
          <Entregables trabajoId={id} entregables={plan.entregables} />
          {trabajo.cliente_id ? (
            <div id="comentarios">
              <Hilo
                comentarios={comentarios}
                vista="propietario"
                nombrePropietario={marca?.responsable ?? "Tú"}
                nombreEmpresa={trabajo.clientes?.nombre ?? "Empresa"}
                enviar={comentarPropietario.bind(null, "trabajo", id, trabajo.cliente_id)}
                descripcion="Lo que escribas aquí lo ve la empresa en su workspace."
              />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
