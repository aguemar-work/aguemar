import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { notFound } from "next/navigation";
import { Pencil, Plus, Laptop, FileText, ClipboardList, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { EtiquetaCotizacion, EtiquetaFicha } from "@/components/panel/etiquetas";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { calcularAvance } from "@/lib/trabajos-util";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { correoDeUsuario, historialCliente, obtenerCliente } from "@/lib/datos/clientes";
import { AccesoEmpresa } from "./acceso";
import { ModulosEmpresa } from "./modulos";
import { formatearFecha, formatearFechaHora, formatearMonto, hoyLima } from "@/lib/format";
import { ETIQUETA_RECORDATORIO, estadoEfectivo } from "@/lib/cotizacion";
import { deudasCotizacion, recordatoriosDeCliente } from "@/lib/datos/cotizaciones";
import { ListaCobros, RegistrarCobro } from "../../cotizaciones/cobros";
import { eliminarCliente } from "../acciones";
import { informesDe } from "@/lib/datos/informes";
import { textoPeriodo } from "@/lib/informe";
import { soloPropietario } from "@/lib/datos/base";
import { cuentaPreviaDeEmpresa, invitacionDeEmpresa } from "@/lib/datos/equipo";
import { estadoAcceso } from "@/lib/acceso-empresa";
import { EtiquetaAcceso } from "@/components/panel/etiqueta-acceso";

export const metadata: Metadata = { title: "Empresa" };

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const { id } = await params;
  const [cliente, historial, informes, invitacion, deudas, recordatorios, cuentaPrevia] = await Promise.all([
    obtenerCliente(id),
    historialCliente(id),
    informesDe({ cliente: id }),
    invitacionDeEmpresa(id),
    deudasCotizacion(id),
    recordatoriosDeCliente(id),
    cuentaPreviaDeEmpresa(id),
  ]);
  if (!cliente) notFound();
  const correoAcceso = await correoDeUsuario(cliente.usuario_id);
  const hoy = hoyLima();
  const aceptadas = historial.cotizaciones.filter((c) => c.estado === "aceptada");
  const totalAceptado = aceptadas.filter((c) => c.moneda === "PEN").reduce((s, c) => s + c.total, 0);
  const totalCobrado = historial.cobros.filter((k) => k.moneda === "PEN").reduce((s, k) => s + k.monto, 0);
  const saldoEmpresa = deudas.filter((d) => d.moneda === "PEN").reduce((s, d) => s + d.pendiente, 0);
  const vencidas = deudas.filter((d) => d.moneda === "PEN" && d.pendiente > 0 && d.dias_atraso > 0);
  const vencido = vencidas.reduce((s, d) => s + d.pendiente, 0);
  const atraso = Math.max(0, ...vencidas.map((d) => d.dias_atraso));

  const datos: [string, string | null][] = [
    ["Documento", cliente.num_doc ? `${cliente.tipo_doc} ${cliente.num_doc}` : null],
    ["Contacto", cliente.contacto],
    ["Teléfono", cliente.telefono],
    ["Correo", cliente.correo],
    ["Dirección", cliente.direccion],
  ];

  return (
    <>
      <PageHeader
        codigo="01"
        titulo={cliente.nombre}
        descripcion={`Empresa desde ${formatearFecha(cliente.created_at)}${cliente.slug ? ` · /w/${cliente.slug}` : ""}`}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href={`/panel/clientes/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
            <ConfirmarEliminar
              titulo={`¿Eliminar la empresa ${cliente.nombre}?`}
              descripcion="Se eliminarán también sus equipos sin fichas. Si tiene cotizaciones o fichas, no se podrá eliminar."
              accion={eliminarCliente.bind(null, id)}
              irA="/panel/clientes"
              textoExito="Empresa eliminada."
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Datos</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {datos.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className={v ? "" : "text-muted-foreground"}>{v ?? "—"}</dd>
                </div>
              ))}
              {cliente.notas ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Notas internas</dt>
                  <dd className="whitespace-pre-line">{cliente.notas}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <AccesoEmpresa
            clienteId={id}
            slug={cliente.slug}
            usuarioId={cliente.usuario_id}
            correoUsuario={correoAcceso}
            correoSugerido={cliente.correo}
            cuentaPrevia={cuentaPrevia}
            invitacion={invitacion ? { id: invitacion.id, token: invitacion.token, correo: invitacion.correo, expira_en: invitacion.expira_en } : null}
            estado={
              <EtiquetaAcceso
                estado={estadoAcceso({ usuarioId: cliente.usuario_id, ultimoIngreso: cliente.ultimo_ingreso, invitacion })}
                ultimoIngreso={cliente.ultimo_ingreso}
              />
            }
          />
          <ModulosEmpresa clienteId={id} modulos={cliente.modulos ?? []} avisos={cliente.avisos_correo !== false} />

          <section aria-labelledby="trabajos">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="trabajos" className="text-base font-semibold">
                Trabajos <span className="font-mono text-sm text-muted-foreground">({historial.trabajos.length})</span>
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/panel/trabajos/nuevo?cliente=${id}`}>
                  <Plus /> Nuevo trabajo
                </Link>
              </Button>
            </div>
            {historial.trabajos.length === 0 ? (
              <EmptyState icono={KanbanSquare} titulo="Sin trabajos con esta empresa." descripcion="Crea uno para empezar a planificar, cotizar y documentar." className="py-8" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trabajo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Avance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.trabajos.map((t) => {
                    const avance = calcularAvance(t.trabajo_tareas ?? []);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <EtiquetaArea area={t.area} />
                          <Link href={`/panel/trabajos/${t.id}`} className="block font-medium underline-offset-4 hover:underline">
                            {t.titulo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <EtiquetaEstadoTrabajo estado={t.estado} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right font-mono tabular">{avance.total > 0 ? `${avance.hechas}/${avance.total}` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </section>

          <section aria-labelledby="equipos">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="equipos" className="text-base font-semibold">
                Equipos <span className="font-mono text-sm text-muted-foreground">({historial.equipos.length})</span>
              </h2>
              <Button asChild size="sm" variant="outline">
                <Link href={`/panel/equipos/nuevo?cliente=${id}`}>
                  <Plus /> Nuevo equipo
                </Link>
              </Button>
            </div>
            {historial.equipos.length === 0 ? (
              <EmptyState
                icono={Laptop}
                titulo="Esta empresa aún no tiene equipos."
                descripcion="Registra la laptop o PC que atiendes para llevar su historial de fichas."
                className="py-8"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead className="hidden md:table-cell">Sistema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.equipos.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link href={`/panel/equipos/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                          {[e.marca, e.modelo].filter(Boolean).join(" ") || "Equipo sin nombre"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="mono">{e.serie}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{e.sistema_operativo ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section aria-labelledby="fichas">
            <h2 id="fichas" className="mb-3 text-base font-semibold">
              Fichas técnicas <span className="font-mono text-sm text-muted-foreground">({historial.fichas.length})</span>
            </h2>
            {historial.fichas.length === 0 ? (
              <EmptyState
                icono={ClipboardList}
                titulo="Sin fichas técnicas todavía."
                descripcion="Ejecuta el script de diagnóstico en el equipo y crea la ficha del servicio."
                className="py-8"
                accion={
                  <Button asChild variant="outline">
                    <Link href={`/panel/fichas/nueva?cliente=${cliente.id}`}>
                      <Plus /> Nueva ficha
                    </Link>
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="hidden md:table-cell">Servicio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.fichas.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/panel/fichas/${f.id}`} className="underline-offset-4 hover:underline">
                          {f.numero}
                        </Link>
                      </TableCell>
                      <TableCell>{formatearFecha(f.fecha)}</TableCell>
                      <TableCell className="hidden md:table-cell">{f.tipo_servicio}</TableCell>
                      <TableCell>
                        <EtiquetaFicha estado={f.estado_final} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section aria-labelledby="informes">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="informes" className="text-base font-semibold">
                Informes <span className="font-mono text-sm text-muted-foreground">({informes.length})</span>
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href={`/panel/informes/nuevo?cliente=${cliente.id}`}>
                  <Plus /> Nuevo informe
                </Link>
              </Button>
            </div>
            {informes.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Sin informes de avance todavía.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {informes.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <Link href={`/panel/informes/${i.id}`} className="min-w-0 underline-offset-4 hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{i.numero}</span>
                      {i.titulo}
                    </Link>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {textoPeriodo(i.periodo_inicio, i.periodo_fin)}
                      {i.publicado ? <Badge variant="ok">Publicado</Badge> : <Badge variant="outline">Borrador</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="cotizaciones">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="cotizaciones" className="text-base font-semibold">
                Cotizaciones <span className="font-mono text-sm text-muted-foreground">({historial.cotizaciones.length})</span>
              </h2>
              <Button asChild variant="outline" size="sm">
                <Link href={`/panel/cotizaciones/nueva?cliente=${cliente.id}`}>
                  <Plus /> Nueva cotización
                </Link>
              </Button>
            </div>
            {historial.cotizaciones.length === 0 ? (
              <EmptyState icono={FileText} titulo="Sin cotizaciones todavía." descripcion="Arma la primera desde tus servicios; al aceptarse se crea el trabajo." className="py-8" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Asunto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.cotizaciones.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/panel/cotizaciones/${c.id}`} className="underline-offset-4 hover:underline">
                          {c.numero}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/panel/cotizaciones/${c.id}`} className="underline-offset-4 hover:underline">
                          {c.asunto || "Sin asunto"}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{formatearFecha(c.fecha)}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular">{formatearMonto(c.total, c.moneda)}</TableCell>
                      <TableCell>
                        <EtiquetaCotizacion estado={estadoEfectivo(c, hoy)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section aria-labelledby="cobros" id="cobros" className="scroll-mt-20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="t-cobros" className="text-base font-semibold">
                Cobros y saldo
              </h2>
              <RegistrarCobro clienteId={cliente.id} opciones={aceptadas.map((c) => ({ id: c.id, numero: c.numero, asunto: c.asunto }))} />
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Aceptado</p>
                <p className="font-mono tabular">{formatearMonto(totalAceptado)}</p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Cobrado</p>
                <p className="font-mono tabular">{formatearMonto(totalCobrado)}</p>
              </div>
              <div
                className={
                  vencido > 0
                    ? "rounded-md bg-danger-soft p-2 text-danger dark:bg-danger/20 dark:text-red-200"
                    : saldoEmpresa > 0
                      ? "rounded-md bg-warning-bg p-2 text-warning-foreground"
                      : "rounded-md bg-success-bg p-2 text-success-foreground"
                }
              >
                <p className="text-xs">{saldoEmpresa > 0 ? "Te debe" : "Al día"}</p>
                <p className="font-mono tabular">{formatearMonto(saldoEmpresa)}</p>
                {vencido > 0 ? (
                  <p className="text-[11px]">
                    {formatearMonto(vencido)} vencido · {atraso} {atraso === 1 ? "día" : "días"}
                  </p>
                ) : null}
              </div>
            </div>
            <ListaCobros cobros={historial.cobros.map((k) => ({ ...k, cotizacion: k.cotizaciones?.numero ?? null }))} />
            <div className="mt-4">
              <h3 className="mb-1 text-sm font-semibold">Recordatorios de pago</h3>
              {recordatorios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no se le envió ninguno. Salen solos 3 días antes del vencimiento, al vencer y a los 7 días de atraso, en las cotizaciones con “Recordar pago” activo.
                </p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {recordatorios.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                      <span>
                        {r.cotizaciones ? (
                          <Link href={`/panel/cotizaciones/${r.cotizaciones.id}`} className="font-mono text-xs underline-offset-4 hover:underline">
                            {r.cotizaciones.numero}
                          </Link>
                        ) : null}{" "}
                        · {ETIQUETA_RECORDATORIO[r.tipo]}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatearFechaHora(r.created_at)} · {formatearMonto(r.pendiente, r.moneda)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
