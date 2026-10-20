import Link from "next/link";
import { FileBarChart, KanbanSquare, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ws } from "@/lib/datos/workspace";
import { formatearFecha, formatearFechaHora, formatearMonto, hoyLima } from "@/lib/format";
import { saldo } from "@/lib/cotizacion";
import { infoTipo } from "@/lib/calendario";
import { moduloActivo } from "@/lib/modulos";
import { textoPeriodo } from "@/lib/informe";
import { textoVencimiento } from "@/lib/trabajos-util";

export default async function InicioWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ws_cotizaciones devuelve null si la empresa no tiene el módulo: no hace falta esperar a saberlo.
  const [empresa, inicio, cot] = await Promise.all([ws.miEmpresa(), ws.inicio(), ws.cotizaciones().catch(() => null)]);
  const hoy = hoyLima();
  const tieneProyectos = moduloActivo(empresa?.modulos, "proyectos");
  const tieneCalendario = moduloActivo(empresa?.modulos, "calendario");
  const tieneSolicitudes = moduloActivo(empresa?.modulos, "solicitudes");
  const tieneInformes = moduloActivo(empresa?.modulos, "informes");

  return (
    <>
      <PageHeader
        codigo="00"
        titulo={`Hola, ${empresa?.nombre ?? ""}`}
        descripcion={`Resumen de tu espacio con ${empresa?.marca?.nombre_comercial ?? "aguemar"} · ${formatearFecha(hoy)}`}
      />

      <section aria-label="Resumen" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Proyectos activos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-mono text-2xl font-semibold tabular">{inicio?.activos ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Entregados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="font-mono text-2xl font-semibold tabular">{inicio?.entregados ?? 0}</p>
          </CardContent>
        </Card>
        {tieneSolicitudes ? (
          <Link href={`/w/${slug}/solicitudes`} className="rounded-lg">
            <Card className="h-full transition-colors hover:border-mint-ink/40">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">Pedidos abiertos</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="font-mono text-2xl font-semibold tabular">{inicio?.solicitudes_abiertas ?? 0}</p>
              </CardContent>
            </Card>
          </Link>
        ) : null}
        {cot ? (
          <>
            <Link href={`/w/${slug}/cotizaciones`} className="rounded-lg">
              <Card className="h-full transition-colors hover:border-mint-ink/40">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Por responder</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="font-mono text-2xl font-semibold tabular">{cot.cotizaciones.filter((c) => c.estado === "enviada").length}</p>
                </CardContent>
              </Card>
            </Link>
            <Link href={`/w/${slug}/cotizaciones`} className="rounded-lg">
              <Card className="h-full transition-colors hover:border-mint-ink/40">
                <CardHeader className="p-4 pb-1">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Saldo pendiente</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="font-mono text-lg font-semibold tabular">{formatearMonto(saldo(cot.total_aceptado, cot.total_cobrado))}</p>
                  {cot.total_vencido > 0 ? (
                    <p className="text-xs text-danger">{formatearMonto(cot.total_vencido)} vencido</p>
                  ) : cot.proximo_pago ? (
                    <p className="text-xs text-muted-foreground">Próximo pago: {formatearFecha(cot.proximo_pago.vence_pago)}</p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          </>
        ) : null}
      </section>

      {tieneCalendario && inicio?.actividades?.length ? (
        <section aria-labelledby="agenda" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="agenda" className="text-base font-semibold">
              Próximas actividades
            </h2>
            <Link href={`/w/${slug}/calendario`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Ver calendario
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inicio.actividades.map((a) => (
              <li key={a.id}>
                <Link href={`/w/${slug}/calendario/${a.id}`} className="flex gap-3 rounded-lg border border-border p-3 hover:border-mint-ink/40">
                  <span className="w-12 shrink-0 text-center">
                    <span className="block font-mono text-lg font-semibold leading-none">{a.fecha.slice(8, 10)}</span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">{formatearFecha(a.fecha).slice(3, 5)}/{a.fecha.slice(2, 4)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.titulo}</span>
                    <span className="text-xs text-muted-foreground">
                      {infoTipo(a.tipo).etiqueta}
                      {a.hora_inicio ? ` · ${a.hora_inicio}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tieneInformes && inicio?.informes?.length ? (
        <section aria-labelledby="informes" className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="informes" className="text-base font-semibold">
              Últimos informes
            </h2>
            <Link href={`/w/${slug}/informes`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {inicio.informes.map((i) => (
              <li key={i.id}>
                <Link href={`/w/${slug}/informes/${i.id}`} className="flex gap-3 rounded-lg border border-border p-3 hover:border-mint-ink/40">
                  <FileBarChart className="mt-0.5 size-4 shrink-0 text-mint-ink dark:text-mint" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{i.titulo}</span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-mono">{i.numero}</span> · {textoPeriodo(i.periodo_inicio, i.periodo_fin)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="proximos">
          <h2 id="proximos" className="mb-3 text-base font-semibold">
            Próximas entregas
          </h2>
          {!inicio || inicio.proximos.length === 0 ? (
            <EmptyState icono={KanbanSquare} titulo="Sin entregas con fecha por ahora." descripcion="Cuando un proyecto tenga fecha comprometida, la verás aquí." className="py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inicio.proximos.map((p) => {
                  const venc = textoVencimiento(p.fecha_compromiso, hoy);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <EtiquetaArea area={p.area} />
                        {tieneProyectos ? (
                          <Link href={`/w/${slug}/proyectos/${p.id}`} className="block font-medium underline-offset-4 hover:underline">
                            {p.titulo}
                          </Link>
                        ) : (
                          <p className="font-medium">{p.titulo}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.fecha_compromiso ? formatearFecha(p.fecha_compromiso) : "—"}
                        <span className={`block text-xs ${venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>{venc.texto}</span>
                      </TableCell>
                      <TableCell>
                        <EtiquetaEstadoTrabajo estado={p.estado} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        <section aria-labelledby="respuestas">
          <h2 id="respuestas" className="mb-3 text-base font-semibold">
            Últimas respuestas de {empresa?.marca?.responsable ?? "aguemar"}
          </h2>
          {!inicio || inicio.respuestas.length === 0 ? (
            <EmptyState icono={MessageSquare} titulo="Sin respuestas recientes." descripcion="Cuando comentes un proyecto y te respondan, lo verás aquí." className="py-8" />
          ) : (
            <ul className="space-y-2">
              {inicio.respuestas.map((r) => (
                <li key={r.id} className="rounded-md border border-border p-3 text-sm">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatearFechaHora(r.created_at)} ·{" "}
                    {r.entidad === "trabajo" && tieneProyectos ? (
                      <Link href={`/w/${slug}/proyectos/${r.entidad_id}`} className="underline-offset-4 hover:underline">
                        {r.titulo ?? "Proyecto"}
                      </Link>
                    ) : r.entidad === "actividad" && tieneCalendario ? (
                      <Link href={`/w/${slug}/calendario/${r.entidad_id}`} className="underline-offset-4 hover:underline">
                        {r.titulo ?? "Actividad"}
                      </Link>
                    ) : r.entidad === "informe" && tieneInformes ? (
                      <Link href={`/w/${slug}/informes/${r.entidad_id}`} className="underline-offset-4 hover:underline">
                        {r.titulo ?? "Informe"}
                      </Link>
                    ) : (
                      r.titulo ?? r.entidad
                    )}
                  </p>
                  <p className="mt-1 line-clamp-3 whitespace-pre-line">{r.texto}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
