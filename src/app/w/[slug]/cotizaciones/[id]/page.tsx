import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileDown, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { saldo } from "@/lib/cotizacion";
import { formatearFecha, formatearFechaHora, formatearMonto } from "@/lib/format";
import { AceptarCotizacion } from "./aceptar";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, c] = await Promise.all([ws.miEmpresa(), ws.cotizacion(id)]);
  if (!moduloActivo(empresa?.modulos, "cotizaciones") || !c) notFound();
  const pendiente = saldo(c.total, c.cobrado);
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
    <>
      <Link href={`/w/${slug}/cotizaciones`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Cotizaciones
      </Link>
      <PageHeader
        titulo={c.asunto}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{c.numero}</span> · <EtiquetaArea area={c.area} /> <EtiquetaCotizacion estado={c.estado} />
          </span>
        }
        acciones={
          <>
            <Button asChild variant="outline">
              <a href={`/w/${slug}/cotizaciones/${c.id}/pdf`} target="_blank" rel="noopener">
                <FileDown /> Ver PDF
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={`/w/${slug}/cotizaciones/${c.id}/pdf?descargar=1`}>Descargar</a>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {c.estado === "enviada" ? <AceptarCotizacion slug={slug} id={c.id} total={formatearMonto(c.total, c.moneda)} contacto={empresa?.contacto ?? null} /> : null}

          {c.estado === "aceptada" && c.aceptacion ? (
            <p className="flex items-start gap-2 rounded-lg border border-border bg-success-bg p-4 text-sm text-success-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Aceptada por {c.aceptacion.nombre} el {formatearFechaHora(c.aceptacion.aceptado_en)}.
                {c.trabajo_id && moduloActivo(empresa?.modulos, "proyectos") ? (
                  <>
                    {" "}
                    <Link href={`/w/${slug}/proyectos/${c.trabajo_id}`} className="inline-flex items-center gap-1 font-medium underline underline-offset-4">
                      <KanbanSquare className="size-3.5" aria-hidden /> Ver el proyecto
                    </Link>
                  </>
                ) : null}
              </span>
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
    </>
  );
}
