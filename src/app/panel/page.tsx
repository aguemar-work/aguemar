import Link from "next/link";
import { FileText, ClipboardList, Inbox, CalendarClock, Users, Laptop, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { EtiquetaCotizacion, EtiquetaFicha } from "@/components/panel/etiquetas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { conSesionOpcional } from "@/lib/datos/base";
import { resumenInicio, type ResumenInicio } from "@/lib/datos/inicio";
import { formatearFecha, formatearMonto } from "@/lib/format";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default async function InicioPanel() {
  const sesion = await conSesionOpcional();
  const resumen: ResumenInicio | null = sesion ? await resumenInicio() : null;
  const [anio, mes] = (resumen?.mes.inicio ?? new Date().toISOString().slice(0, 10)).split("-").map(Number);

  const indicadores = [
    { etiqueta: "Cotizaciones emitidas", valor: String(resumen?.cotizacionesEmitidas ?? 0), href: "/panel/cotizaciones" },
    { etiqueta: "Esperando respuesta", valor: String(resumen?.esperandoRespuesta ?? 0), href: "/panel/cotizaciones" },
    { etiqueta: "Monto aceptado", valor: formatearMonto(resumen?.montoAceptado ?? 0), href: "/panel/cotizaciones" },
    { etiqueta: "Fichas emitidas", valor: String(resumen?.fichasEmitidas ?? 0), href: "/panel/fichas" },
    { etiqueta: "Leads nuevos", valor: String(resumen?.leadsNuevos ?? 0), href: "/panel/leads" },
  ];

  return (
    <>
      <PageHeader
        codigo="00"
        titulo="Inicio"
        descripcion={`Resumen de ${MESES[mes - 1]} de ${anio} · ${resumen?.totalClientes ?? 0} clientes · ${resumen?.totalEquipos ?? 0} equipos`}
        acciones={
          <>
            <Button asChild variant="outline">
              <Link href="/panel/clientes/nuevo">
                <Users /> Nuevo cliente
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/panel/equipos/nuevo">
                <Laptop /> Nuevo equipo
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Indicadores del mes" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {indicadores.map((i) => (
          <Link key={i.etiqueta} href={i.href} className="rounded-lg">
            <Card className="h-full transition-colors hover:border-mint-ink/40">
              <CardHeader className="p-4 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground">{i.etiqueta}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="font-mono text-2xl font-semibold tabular">{i.valor}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="ultimas-cotizaciones">
          <h2 id="ultimas-cotizaciones" className="mb-3 text-base font-semibold">
            Últimas cotizaciones
          </h2>
          {!resumen || resumen.ultimasCotizaciones.length === 0 ? (
            <EmptyState
              icono={FileText}
              titulo="Aún no hay cotizaciones."
              descripcion="Crea la primera y aparecerá aquí con su estado. Disponible en la Fase 3."
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.ultimasCotizaciones.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.numero}</TableCell>
                    <TableCell>{c.clientes?.nombre ?? "—"}</TableCell>
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

        <section aria-labelledby="ultimas-fichas">
          <h2 id="ultimas-fichas" className="mb-3 text-base font-semibold">
            Últimas fichas técnicas
          </h2>
          {!resumen || resumen.ultimasFichas.length === 0 ? (
            <EmptyState icono={ClipboardList} titulo="Aún no hay fichas técnicas." descripcion="Registra un servicio y entrega la ficha a tu cliente." className="py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Equipo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.ultimasFichas.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                    <TableCell>{f.clientes?.nombre ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{f.equipos ? `${f.equipos.modelo ?? ""} · ${f.equipos.serie}` : "—"}</TableCell>
                    <TableCell>
                      <EtiquetaFicha estado={f.estado_final} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section aria-labelledby="mantenimientos" className="lg:col-span-2">
          <h2 id="mantenimientos" className="mb-3 text-base font-semibold">
            Mantenimientos próximos a vencer
          </h2>
          {!resumen || resumen.proximosMantenimientos.length === 0 ? (
            <EmptyState
              icono={CalendarClock}
              titulo="Nada por vencer en los próximos 30 días."
              descripcion="Cuando una ficha tenga fecha de próximo mantenimiento cercana, te avisaremos aquí."
              className="py-8"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vence</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Equipo</TableHead>
                  <TableHead>Ficha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.proximosMantenimientos.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.proximo_mantenimiento ? formatearFecha(f.proximo_mantenimiento) : "—"}</TableCell>
                    <TableCell>{f.clientes?.nombre ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{f.equipos ? `${f.equipos.modelo ?? ""} · ${f.equipos.serie}` : "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{f.numero}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <section aria-labelledby="leads" className="lg:col-span-2">
          <h2 id="leads" className="mb-3 text-base font-semibold">
            Leads recientes
          </h2>
          <EmptyState
            icono={Inbox}
            titulo={resumen && resumen.leadsNuevos > 0 ? `${resumen.leadsNuevos} mensajes nuevos.` : "Sin mensajes nuevos."}
            descripcion="Los mensajes del formulario de la landing llegan a la bandeja de leads (Fase 7)."
            className="py-8"
            accion={
              resumen && resumen.leadsNuevos > 0 ? (
                <Button asChild variant="outline">
                  <Link href="/panel/leads">
                    <Plus /> Ver leads
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </section>
      </div>
    </>
  );
}
