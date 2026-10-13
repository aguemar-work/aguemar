import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { KanbanSquare, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaArea, EtiquetaEstadoTrabajo } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { opcionesClientes } from "@/lib/datos/clientes";
import { listarTrabajos, type FiltrosTrabajos } from "@/lib/datos/trabajos";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";
import { calcularAvance, textoVencimiento } from "@/lib/trabajos-util";
import type { Area, EstadoTrabajo } from "@/types/database";
import { FiltrosTrabajos as Filtros } from "./filtros";
import { Tablero } from "./tablero";

export const metadata: Metadata = { title: "Trabajos" };

interface Props {
  searchParams: Promise<{ q?: string; area?: string; estado?: string; cliente?: string; vista?: string }>;
}

export default async function TrabajosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const vista = sp.vista === "tablero" ? "tablero" : "lista";
  const filtros: FiltrosTrabajos = {
    area: (sp.area as Area) || undefined,
    estado: vista === "tablero" ? "todos" : ((sp.estado as EstadoTrabajo | "activos" | "todos") || "activos"),
    clienteId: sp.cliente || undefined,
    busqueda: sp.q,
  };
  const [trabajos, clientes] = await Promise.all([listarTrabajos(filtros), opcionesClientes()]);
  const hoy = hoyLima();
  const hayFiltros = Boolean(sp.q || sp.area || sp.cliente || (sp.estado && sp.estado !== "activos"));

  return (
    <>
      <PageHeader
        codigo="04"
        titulo="Trabajos"
        descripcion="Todo lo que haces, por área y estado. Las cotizaciones, cobros y documentos se cuelgan de aquí."
        acciones={
          <Button asChild variant="mint">
            <Link href="/panel/trabajos/nuevo">
              <Plus /> Nuevo trabajo
            </Link>
          </Button>
        }
      />

      <Suspense>
        <Filtros clientes={clientes} vista={vista} />
      </Suspense>

      {trabajos.length === 0 ? (
        <EmptyState
          icono={KanbanSquare}
          titulo={hayFiltros ? "Sin trabajos para ese filtro." : "Aún no hay trabajos."}
          descripcion={hayFiltros ? "Prueba con otro filtro o crea el trabajo." : "Crea el primero: un sitio, una identidad, un mantenimiento. Lo que sea que estés haciendo."}
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/trabajos/nuevo">
                <Plus /> Nuevo trabajo
              </Link>
            </Button>
          }
        />
      ) : vista === "tablero" ? (
        <Tablero trabajos={trabajos} hoy={hoy} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trabajo</TableHead>
              <TableHead className="hidden md:table-cell">Cliente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Compromiso</TableHead>
              <TableHead className="hidden sm:table-cell text-right">Avance</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trabajos.map((t) => {
              const avance = calcularAvance(t.trabajo_tareas ?? []);
              const venc = textoVencimiento(t.fecha_compromiso, hoy);
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <EtiquetaArea area={t.area} />
                    <Link href={`/panel/trabajos/${t.id}`} className="block font-medium underline-offset-4 hover:underline">
                      {t.titulo}
                    </Link>
                    <p className="text-xs text-muted-foreground md:hidden">{t.clientes?.nombre ?? "Sin cliente"}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{t.clientes?.nombre ?? <span className="text-muted-foreground">Sin cliente</span>}</TableCell>
                  <TableCell>
                    <EtiquetaEstadoTrabajo estado={t.estado} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {t.fecha_compromiso ? (
                      <>
                        {formatearFecha(t.fecha_compromiso)}
                        <span className={`block text-xs ${venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>{venc.texto}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right">
                    {avance.total > 0 ? (
                      <Badge variant={avance.porcentaje === 100 ? "ok" : "outline"} className="font-mono">
                        {avance.hechas}/{avance.total}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin tareas</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-mono tabular">
                    {t.monto_estimado != null ? formatearMonto(t.monto_estimado, t.moneda) : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
