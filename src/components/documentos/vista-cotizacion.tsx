import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { estadoPago, etiquetaVersion } from "@/lib/cotizacion";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";
import type { WsCotizacion } from "@/lib/datos/workspace";

/**
 * Cotización en pantalla para quien la recibe (workspace y portal): detalle,
 * totales, condiciones, fechas, pagos y datos de pago. Sin notas internas.
 */
export function VistaCotizacion({ c, arriba }: { c: WsCotizacion; arriba?: React.ReactNode }) {
  // El pendiente y la fecha de pago vienen del documento (deudas_cotizacion): una sola cuenta para todos.
  const pago = c.estado === "aceptada" && c.vence_pago && c.pendiente != null ? { vence_pago: c.vence_pago, pendiente: c.pendiente } : null;
  const pendiente = pago ? pago.pendiente : 0;
  const estado = pago ? estadoPago(pago, hoyLima()) : null;
  const condiciones = (c.condiciones ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const pagos = c.marca
    ? ([
        ["Cuenta", c.marca.pago_cuenta],
        ["CCI", c.marca.pago_cci],
        ["Yape", c.marca.pago_yape],
        ["Plin", c.marca.pago_plin],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {arriba}
        {c.estado === "anulada" ? (
          <p role="status" className="rounded-lg border border-border bg-soft p-4 text-sm dark:bg-secondary/50">
            Esta cotización fue anulada{c.anulada_en ? ` el ${formatearFecha(c.anulada_en.slice(0, 10))}` : ""}. Si tienes dudas, escríbenos.
          </p>
        ) : null}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Detalle</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {c.items.map((it, i) => {
                const [titulo, ...detalle] = it.descripcion.split(/\r?\n/);
                return (
                  <li key={i} className="flex gap-3 py-3">
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
            <dl className="ml-auto mt-3 max-w-xs space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-mono tabular">{formatearMonto(c.subtotal, c.moneda)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IGV {c.igv_pct / 100} %{c.igv_modo === "incluido" ? " (incluido)" : ""}</dt>
                <dd className="font-mono tabular">{formatearMonto(c.igv, c.moneda)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="font-mono tabular">{formatearMonto(c.total, c.moneda)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {condiciones.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Condiciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {condiciones.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-mint-ink dark:text-mint">›</span> {l}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-3 pt-5 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Emitida</p>
              <p className="font-mono">{formatearFecha(c.fecha)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Válida hasta</p>
              <p className="font-mono">{formatearFecha(c.vence)}</p>
            </div>
            {etiquetaVersion(c.version, c.huella) ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Versión</p>
                <p className="font-mono">{etiquetaVersion(c.version, c.huella)}</p>
              </div>
            ) : null}
            {pago && estado && pendiente > 0 ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Fecha de pago</p>
                <p>
                  <span className="font-mono">{formatearFecha(pago.vence_pago)}</span>
                  <span className={`ml-2 text-xs ${estado.tono === "danger" ? "text-danger" : estado.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>{estado.texto}</span>
                </p>
              </div>
            ) : null}
            {c.estado === "aceptada" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-md bg-soft p-2 dark:bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Pagado</p>
                  <p className="font-mono tabular">{formatearMonto(c.cobrado, c.moneda)}</p>
                </div>
                <div className={pendiente > 0 ? "rounded-md bg-warning-bg p-2 text-warning-foreground" : "rounded-md bg-success-bg p-2 text-success-foreground"}>
                  <p className="text-xs">{pendiente > 0 ? "Saldo" : "Pagada"}</p>
                  <p className="font-mono tabular">{formatearMonto(pendiente, c.moneda)}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {pagos.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Datos de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {pagos.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
