import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { MEDIOS_PAGO, estadoPago, saldo } from "@/lib/cotizacion";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";

export const metadata: Metadata = { title: "Cotizaciones y cobros" };

export default async function CotizacionesWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [empresa, datos] = await Promise.all([ws.miEmpresa(), ws.cotizaciones()]);
  if (!moduloActivo(empresa?.modulos, "cotizaciones") || !datos) notFound();

  const pendiente = saldo(datos.total_aceptado, datos.total_cobrado);
  const porResponder = datos.cotizaciones.filter((c) => c.estado === "enviada");
  const hoy = hoyLima();
  const vencido = datos.total_vencido ?? 0;
  const proximo = datos.proximo_pago;
  const resumen: { k: string; v: number; tono: string; nota?: string | null }[] = [
    { k: "Aceptado", v: datos.total_aceptado, tono: "" },
    { k: "Pagado", v: datos.total_cobrado, tono: "" },
    {
      k: pendiente > 0 ? "Saldo pendiente" : "Saldo",
      v: pendiente,
      tono:
        vencido > 0
          ? "bg-danger-soft text-danger border-transparent dark:bg-danger/20 dark:text-red-200"
          : pendiente > 0
            ? "bg-warning-bg text-warning-foreground border-transparent"
            : "bg-success-bg text-success-foreground border-transparent",
      nota: vencido > 0 ? `${formatearMonto(vencido)} vencido` : pendiente > 0 && proximo ? `Próximo pago: ${formatearFecha(proximo.vence_pago)}` : null,
    },
  ];

  return (
    <>
      <PageHeader codigo="02" titulo="Cotizaciones y cobros" descripcion="Las propuestas que te enviamos, lo que aceptaste y lo que ya pagaste." />

      <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {resumen.map((r) => (
          <div key={r.k} className={`rounded-lg border border-border p-3 ${r.tono}`}>
            <dt className="text-xs opacity-80">{r.k}</dt>
            <dd className="font-mono text-lg font-semibold tabular">{formatearMonto(r.v)}</dd>
            {r.nota ? <dd className="text-xs">{r.nota}</dd> : null}
          </div>
        ))}
      </dl>

      {vencido > 0 ? (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger dark:bg-danger/20 dark:text-red-200">
          Tienes {formatearMonto(vencido)} con la fecha de pago vencida. Si ya pagaste, avísanos y lo registramos.
        </p>
      ) : null}

      {porResponder.length ? (
        <p className="mb-4 rounded-lg border border-mint-ink/30 bg-success-bg px-4 py-3 text-sm text-success-foreground">
          Tienes {porResponder.length === 1 ? "una cotización esperando" : `${porResponder.length} cotizaciones esperando`} tu respuesta. Ábrela para revisarla y aceptarla.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2" aria-labelledby="t-cot">
          <h2 id="t-cot" className="mb-3 text-base font-semibold">
            Cotizaciones
          </h2>
          {datos.cotizaciones.length === 0 ? (
            <EmptyState icono={Receipt} titulo="Aún no hay cotizaciones." descripcion="Cuando te enviemos una propuesta, aparecerá aquí con su PDF." className="py-10" />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {datos.cotizaciones.map((c) => {
                const pago = c.estado === "aceptada" && c.vence_pago && c.pendiente ? estadoPago({ pendiente: c.pendiente, vence_pago: c.vence_pago }, hoy) : null;
                return (
                  <li key={c.id}>
                    <Link href={`/w/${slug}/cotizaciones/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-soft/60 dark:hover:bg-secondary/40">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.asunto}</p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{c.numero}</span> · {formatearFecha(c.fecha)} · <EtiquetaArea area={c.area} />
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm tabular">{formatearMonto(c.total, c.moneda)}</p>
                        <EtiquetaCotizacion estado={c.estado} />
                        {pago ? (
                          <p className={`mt-1 text-xs ${pago.tono === "danger" ? "text-danger" : pago.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>
                            {pago.texto}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Pagos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {datos.cobros.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay pagos registrados.</p>
            ) : (
              <ul className="divide-y divide-border">
                {datos.cobros.map((k) => (
                  <li key={k.id} className="py-2 text-sm">
                    <p className="font-mono tabular">{formatearMonto(k.monto, k.moneda)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatearFecha(k.fecha)} · {MEDIOS_PAGO.find((m) => m.valor === k.medio)?.etiqueta ?? k.medio}
                      {k.cotizacion_numero ? ` · ${k.cotizacion_numero}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
