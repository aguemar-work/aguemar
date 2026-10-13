import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Laptop, FileText, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { EtiquetaCotizacion, EtiquetaFicha } from "@/components/panel/etiquetas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { historialCliente, obtenerCliente } from "@/lib/datos/clientes";
import { formatearFecha, formatearMonto } from "@/lib/format";
import { eliminarCliente } from "../acciones";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();
  const historial = await historialCliente(id);

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
        descripcion={`Cliente desde ${formatearFecha(cliente.created_at)}`}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href={`/panel/clientes/${id}/editar`}>
                <Pencil /> Editar
              </Link>
            </Button>
            <ConfirmarEliminar
              titulo={`¿Eliminar a ${cliente.nombre}?`}
              descripcion="Se eliminarán también sus equipos sin fichas. Si tiene cotizaciones o fichas, no se podrá eliminar."
              accion={eliminarCliente.bind(null, id)}
              irA="/panel/clientes"
              textoExito="Cliente eliminado."
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
                titulo="Este cliente aún no tiene equipos."
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
              <EmptyState icono={ClipboardList} titulo="Sin fichas técnicas todavía." descripcion="Las fichas se crean en la Fase 4." className="py-8" />
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
                      <TableCell className="font-mono text-xs">{f.numero}</TableCell>
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

          <section aria-labelledby="cotizaciones">
            <h2 id="cotizaciones" className="mb-3 text-base font-semibold">
              Cotizaciones <span className="font-mono text-sm text-muted-foreground">({historial.cotizaciones.length})</span>
            </h2>
            {historial.cotizaciones.length === 0 ? (
              <EmptyState icono={FileText} titulo="Sin cotizaciones todavía." descripcion="Las cotizaciones se crean en la Fase 3." className="py-8" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historial.cotizaciones.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                      <TableCell>{formatearFecha(c.fecha)}</TableCell>
                      <TableCell className="text-right font-mono tabular">{formatearMonto(c.total, c.moneda)}</TableCell>
                      <TableCell>
                        <EtiquetaCotizacion estado={c.estado} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
