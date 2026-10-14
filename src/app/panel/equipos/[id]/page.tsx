import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { EtiquetaFicha } from "@/components/panel/etiquetas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fichasDeEquipo, obtenerEquipo } from "@/lib/datos/equipos";
import { formatearFecha } from "@/lib/format";
import { eliminarEquipo } from "../acciones";

export const metadata: Metadata = { title: "Equipo" };

export default async function EquipoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [equipo, fichas] = await Promise.all([obtenerEquipo(id), fichasDeEquipo(id)]);
  if (!equipo) notFound();
  const nombre = [equipo.marca, equipo.modelo].filter(Boolean).join(" ") || "Equipo sin nombre";

  const specs: [string, string | null][] = [
    ["Número de serie", equipo.serie],
    ["Sistema operativo", equipo.sistema_operativo],
    ["Procesador", equipo.procesador],
    ["Memoria RAM", equipo.ram],
    ["Almacenamiento", equipo.almacenamiento],
    ["Gráfica", equipo.grafica],
    ["Batería", equipo.bateria],
    ["BIOS", equipo.bios],
  ];

  return (
    <>
      <PageHeader
        codigo="02"
        titulo={nombre}
        descripcion={
          equipo.clientes ? (
            <>
              De{" "}
              <Link href={`/panel/clientes/${equipo.clientes.id}`} className="underline-offset-4 hover:underline">
                {equipo.clientes.nombre}
              </Link>
            </>
          ) : undefined
        }
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href={`/panel/equipos/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
            <ConfirmarEliminar
              titulo={`¿Eliminar ${nombre}?`}
              descripcion="Solo se puede eliminar si no tiene fichas técnicas."
              accion={eliminarEquipo.bind(null, id, equipo.cliente_id)}
              irA={`/panel/clientes/${equipo.cliente_id}`}
              textoExito="Equipo eliminado."
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ficha del equipo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className={k === "Número de serie" ? "font-mono" : v ? "" : "text-muted-foreground"}>{v ?? "—"}</dd>
                </div>
              ))}
              {equipo.notas ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Notas</dt>
                  <dd className="whitespace-pre-line">{equipo.notas}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        <section aria-labelledby="historial" className="lg:col-span-2">
          <h2 id="historial" className="mb-3 text-base font-semibold">
            Historial de fichas <span className="font-mono text-sm text-muted-foreground">({fichas.length})</span>
          </h2>
          {fichas.length === 0 ? (
            <EmptyState
              icono={ClipboardList}
              titulo="Este equipo aún no tiene fichas."
              descripcion="Cada servicio deja una ficha; así ves cómo evoluciona el equipo entre mantenimientos."
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="hidden md:table-cell">Servicio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Próximo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fichas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                    <TableCell>{formatearFecha(f.fecha)}</TableCell>
                    <TableCell className="hidden md:table-cell">{f.tipo_servicio}</TableCell>
                    <TableCell>
                      <EtiquetaFicha estado={f.estado_final} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{f.proximo_mantenimiento ? formatearFecha(f.proximo_mantenimiento) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
