import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaCotizacion } from "@/components/panel/etiquetas";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarCotizaciones } from "@/lib/datos/cotizaciones";
import { opcionesClientes } from "@/lib/datos/clientes";
import { estadoEfectivo, saldo } from "@/lib/cotizacion";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";
import type { EstadoCotizacion } from "@/types/database";
import { FiltrosCotizaciones } from "./filtros";

export const metadata: Metadata = { title: "Cotizaciones" };

interface Props {
  searchParams: Promise<{ estado?: string; cliente?: string; q?: string }>;
}

const ESTADOS: EstadoCotizacion[] = ["borrador", "enviada", "aceptada", "rechazada", "vencida"];

export default async function CotizacionesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const pedido = ESTADOS.includes(sp.estado as EstadoCotizacion) ? (sp.estado as EstadoCotizacion) : undefined;
  // "enviada" y "vencida" se filtran después: una enviada cuya validez pasó se muestra como vencida.
  const [todas, clientes] = await Promise.all([
    listarCotizaciones({ estado: pedido === "vencida" || pedido === "enviada" ? undefined : pedido, cliente: sp.cliente, q: sp.q }),
    opcionesClientes(),
  ]);
  const hoy = hoyLima();
  const filas = todas
    .map((c) => ({ ...c, efectivo: estadoEfectivo(c, hoy), cobrado: c.cobros.reduce((s, k) => s + k.monto, 0) }))
    .filter((c) => !pedido || c.efectivo === pedido);

  const pen = filas.filter((c) => c.moneda === "PEN");
  const resumen = [
    { etiqueta: "Esperando respuesta", valor: pen.filter((c) => c.efectivo === "enviada").reduce((s, c) => s + c.total, 0) },
    { etiqueta: "Aceptado", valor: pen.filter((c) => c.efectivo === "aceptada").reduce((s, c) => s + c.total, 0) },
    { etiqueta: "Por cobrar", valor: pen.filter((c) => c.efectivo === "aceptada").reduce((s, c) => s + saldo(c.total, c.cobrado), 0) },
  ];
  const hayFiltros = Boolean(sp.estado || sp.cliente || sp.q);

  return (
    <>
      <PageHeader
        codigo="05"
        titulo="Cotizaciones"
        descripcion="Arma la propuesta desde tus servicios. Al aceptarse se crea el trabajo; aquí registras lo que te pagan."
        acciones={
          <Button asChild variant="mint">
            <Link href="/panel/cotizaciones/nueva">
              <Plus /> Nueva cotización
            </Link>
          </Button>
        }
      />

      <FiltrosCotizaciones clientes={clientes} />

      {todas.length === 0 && !hayFiltros ? (
        <EmptyState
          icono={FileText}
          titulo="Aún no hay cotizaciones."
          descripcion="Crea la primera: elige la empresa, agrega líneas desde tus servicios y envíala. Cuando la acepten, el trabajo aparece solo."
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/cotizaciones/nueva">
                <Plus /> Nueva cotización
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {resumen.map((r) => (
              <div key={r.etiqueta} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{r.etiqueta}</dt>
                <dd className="font-mono text-lg font-semibold tabular">{formatearMonto(r.valor)}</dd>
              </div>
            ))}
          </dl>
          {filas.length === 0 ? (
            <EmptyState icono={FileText} titulo="Sin cotizaciones con esos filtros." descripcion="Prueba con otro estado o empresa." className="py-10" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((c) => {
                  const pendiente = saldo(c.total, c.cobrado);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/panel/cotizaciones/${c.id}`} className="underline-offset-4 hover:underline">
                          {c.numero}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/panel/cotizaciones/${c.id}`} className="block font-medium underline-offset-4 hover:underline">
                          {c.asunto || "Sin asunto"}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          <EtiquetaArea area={c.area} /> · {c.clientes?.nombre ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{formatearFecha(c.fecha)}</TableCell>
                      <TableCell className="text-right font-mono tabular">{formatearMonto(c.total, c.moneda)}</TableCell>
                      <TableCell className="hidden text-right font-mono text-xs tabular lg:table-cell">
                        {c.efectivo !== "aceptada" ? "—" : pendiente === 0 ? <span className="text-mint-ink dark:text-mint">Pagada</span> : formatearMonto(pendiente, c.moneda)}
                      </TableCell>
                      <TableCell>
                        <EtiquetaCotizacion estado={c.efectivo} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </>
  );
}
