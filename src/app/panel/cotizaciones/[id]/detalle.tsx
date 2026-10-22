import Link from "@/components/panel/enlace";
import { notFound } from "next/navigation";
import { Ban, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerCotizacion, obtenerDocumentoCotizacion } from "@/lib/datos/cotizaciones";
import { enlaceDe } from "@/lib/datos/fichas";
import { estadoEfectivo, etiquetaVersion, fechaVence, saldo } from "@/lib/cotizacion";
import { formatearFecha, formatearFechaHora, formatearMonto, hoyLima } from "@/lib/format";
import { textoVencimiento } from "@/lib/trabajos-util";
import type { EstadoTrabajo } from "@/types/database";
import { eliminarCotizacion } from "../acciones";
import { ListaCobros, RegistrarCobro } from "../cobros";
import { AccionesCotizacion } from "./acciones-cotizacion";
import { PagoCotizacion } from "./pago";

/** Detalle de una cotización. Se usa en la página completa y en el panel lateral (@modal). */
export async function DetalleCotizacion({ id }: { id: string }) {
  const [c, enlace, doc] = await Promise.all([obtenerCotizacion(id), enlaceDe("cotizacion", id), obtenerDocumentoCotizacion(id)]);
  if (!c) notFound();
  const hoy = hoyLima();
  const estado = estadoEfectivo(c, hoy);
  const vence = fechaVence(c.fecha, c.validez_dias);
  const venc = textoVencimiento(vence, hoy);
  const cobrado = c.cobros.filter((k) => !k.anulado_en).reduce((s, k) => s + k.monto, 0);
  // Pendiente y vencimiento: los mismos que ven la empresa y el portal (deudas_cotizacion).
  const deuda = doc?.vence_pago && doc.pendiente != null ? { pendiente: doc.pendiente, vence_pago: doc.vence_pago } : null;
  const saldoLigado = saldo(c.total, cobrado);
  const pendiente = deuda ? deuda.pendiente : saldoLigado;
  const aceptacion = c.aceptaciones[0];
  const empresa = c.clientes;
  const conWorkspace = Boolean(empresa?.usuario_id && empresa.slug && empresa.modulos?.includes("cotizaciones"));
  const condiciones = (c.condiciones ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        codigo="05"
        titulo={c.asunto || "Cotización sin asunto"}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.numero}</span>
            <span>·</span>
            {empresa ? (
              <Link href={`/panel/clientes/${empresa.id}`} className="underline-offset-4 hover:underline">
                {empresa.nombre}
              </Link>
            ) : null}
            <EtiquetaArea area={c.area} />
            <EtiquetaCotizacion estado={estado} />
          </span>
        }
        acciones={
          <AccionesCotizacion
            id={c.id}
            numero={c.numero}
            estado={estado}
            total={c.total}
            moneda={c.moneda}
            asunto={c.asunto}
            vence={formatearFecha(vence)}
            empresa={{
              nombre: empresa?.nombre ?? "la empresa",
              contacto: empresa?.contacto ?? null,
              telefono: empresa?.telefono ?? null,
              correo: empresa?.correo ?? null,
              slug: empresa?.slug ?? null,
              conWorkspace,
              // Se le puede invitar desde aquí: tiene correo y aún no tiene usuario.
              invitable: Boolean(empresa?.correo && !empresa.usuario_id),
            }}
            token={enlace && !enlace.revocado ? enlace.token : null}
            aceptadaEn={estado === "aceptada" ? (aceptacion?.aceptado_en ?? c.aceptada_en ?? null) : null}
            cobrado={cobrado}
          />
        }
      />

      {c.estado === "anulada" ? (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-soft p-4 text-sm dark:bg-secondary/50">
          <Ban className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            Anulada{c.anulada_en ? ` el ${formatearFechaHora(c.anulada_en)}` : ""}
            {c.anulada_motivo ? `: ${c.anulada_motivo}` : ""}. Ya no cuenta como deuda ni genera recordatorios; la aceptación sigue guardada tal como fue.
          </span>
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Líneas</CardTitle>
            </CardHeader>
            <CardContent>
              {c.cotizacion_items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin líneas. Edítala para agregar desde tus servicios.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {c.cotizacion_items.map((it, i) => {
                    const [titulo, ...detalle] = it.descripcion.split(/\r?\n/);
                    return (
                      <li key={it.id} className="flex gap-3 py-3">
                        <span className="w-6 shrink-0 font-mono text-xs text-mint-ink dark:text-mint">{String(i + 1).padStart(2, "0")}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{titulo}</p>
                          {detalle.length ? <p className="whitespace-pre-line text-xs text-muted-foreground">{detalle.join("\n")}</p> : null}
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {String(Number(it.cantidad)).replace(".", ",")} {it.unidad} × {formatearMonto(it.precio_unitario, c.moneda)}
                            {it.descuento ? ` − ${formatearMonto(it.descuento, c.moneda)}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm tabular">{formatearMonto(it.importe, c.moneda)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <dl className="ml-auto mt-3 max-w-xs space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-mono tabular">{formatearMonto(c.subtotal, c.moneda)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    IGV {c.igv_pct / 100} %{c.igv_modo === "incluido" ? " (incluido)" : ""}
                  </dt>
                  <dd className="font-mono tabular">{formatearMonto(c.igv, c.moneda)}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="font-mono tabular">{formatearMonto(c.total, c.moneda)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {condiciones.length || c.notas ? (
            <Card>
              <CardContent className="grid gap-6 pt-5 sm:grid-cols-2">
                {condiciones.length ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Condiciones</h3>
                    <ul className="space-y-1 text-sm">
                      {condiciones.map((l, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-mono text-mint-ink dark:text-mint">›</span> {l}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {c.notas ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Notas internas</h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{c.notas}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Seguimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Emitida</dt>
                  <dd className="font-mono">{formatearFecha(c.fecha)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Válida hasta</dt>
                  <dd>
                    <span className="font-mono">{formatearFecha(vence)}</span>
                    {estado === "enviada" || estado === "borrador" ? <span className="ml-2 text-xs text-muted-foreground">{venc.texto}</span> : null}
                  </dd>
                </div>
                {c.enviada_en ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Enviada</dt>
                    <dd className="font-mono">{formatearFechaHora(c.enviada_en)}</dd>
                  </div>
                ) : null}
                {etiquetaVersion(c.version, doc?.huella ?? c.enviada_huella) ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Versión</dt>
                    <dd className="font-mono">{etiquetaVersion(c.version, doc?.huella ?? c.enviada_huella)}</dd>
                  </div>
                ) : null}
                {aceptacion ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Aceptada</dt>
                    <dd>
                      {aceptacion.nombre}
                      {aceptacion.dni ? <span className="font-mono"> · DNI {aceptacion.dni}</span> : null}
                      <span className="block text-xs text-muted-foreground">
                        {formatearFechaHora(aceptacion.aceptado_en)} · {aceptacion.registrada_por === "empresa" ? "desde su espacio" : aceptacion.registrada_por === "portal" ? "por enlace" : "registrada por aguemar"}
                      </span>
                    </dd>
                  </div>
                ) : null}
                {c.estado === "rechazada" ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Rechazada</dt>
                    <dd>{c.motivo_rechazo ?? "Sin motivo anotado."}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Workspace</dt>
                  <dd className="text-muted-foreground">
                    {conWorkspace ? (estado === "borrador" ? "La verá al enviarla." : "La empresa la ve en su espacio.") : "La empresa no tiene el módulo Cotizaciones."}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {c.trabajos ? (
            <Link href={`/panel/trabajos/${c.trabajos.id}`} className="block rounded-lg border border-border p-4 hover:border-mint-ink/40">
              <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <KanbanSquare className="size-3.5" aria-hidden /> Trabajo creado
              </p>
              <p className="font-medium">{c.trabajos.titulo}</p>
              <div className="mt-1">
                <EtiquetaEstadoTrabajo estado={c.trabajos.estado as EstadoTrabajo} />
              </div>
            </Link>
          ) : null}

          {c.estado === "aceptada" ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
                <CardTitle>Cobros</CardTitle>
                {empresa ? <RegistrarCobro clienteId={empresa.id} cotizacion={{ id: c.id, numero: c.numero, moneda: c.moneda, saldo: pendiente }} /> : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-soft p-2 dark:bg-secondary/50">
                    <p className="text-xs text-muted-foreground">Cobrado</p>
                    <p className="font-mono tabular">{formatearMonto(cobrado, c.moneda)}</p>
                  </div>
                  <div className={pendiente > 0 ? "rounded-md bg-warning-bg p-2 text-warning-foreground" : "rounded-md bg-success-bg p-2 text-success-foreground"}>
                    <p className="text-xs">{pendiente > 0 ? "Saldo" : "Pagada"}</p>
                    <p className="font-mono tabular">{formatearMonto(pendiente, c.moneda)}</p>
                  </div>
                </div>
                <ListaCobros cobros={c.cobros} />
              </CardContent>
            </Card>
          ) : null}

          {c.estado !== "rechazada" ? (
            <PagoCotizacion
              id={c.id}
              aceptada={c.estado === "aceptada"}
              plazo={c.plazo_pago_dias}
              recordar={c.recordar_pago}
              moneda={c.moneda}
              hoy={hoy}
              deuda={deuda}
              saldoLigado={saldoLigado}
              recordatorios={c.recordatorios_cobro}
              sinAvisos={!empresa?.avisos_correo || !(empresa.correo || empresa.usuario_id)}
            />
          ) : null}

          {c.estado !== "aceptada" ? (
            <ConfirmarEliminar
              titulo={`¿Eliminar ${c.numero}?`}
              descripcion="Se elimina la cotización con sus líneas. El número no se vuelve a usar."
              accion={eliminarCotizacion.bind(null, c.id)}
              irA="/panel/cotizaciones"
              textoExito="Cotización eliminada."
              variant="ghost"
              size="sm"
            >
              Eliminar cotización
            </ConfirmarEliminar>
          ) : null}
        </div>
      </div>
    </>
  );
}
