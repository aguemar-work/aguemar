import Link from "next/link";
import { FileText, ClipboardList, Inbox, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatearFecha, formatearMonto } from "@/lib/format";

const INDICADORES = [
  { etiqueta: "Cotizaciones emitidas", valor: "0" },
  { etiqueta: "Esperando respuesta", valor: "0" },
  { etiqueta: "Monto aceptado", valor: formatearMonto(0) },
  { etiqueta: "Fichas emitidas", valor: "0" },
  { etiqueta: "Leads nuevos", valor: "0" },
];

export default function InicioPanel() {
  return (
    <>
      <PageHeader
        codigo="00"
        titulo="Inicio"
        descripcion={`Resumen del mes · ${formatearFecha(new Date())}`}
      />

      <section aria-label="Indicadores del mes" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {INDICADORES.map((i) => (
          <Card key={i.etiqueta}>
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{i.etiqueta}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="font-mono text-2xl font-semibold tabular">{i.valor}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="ultimas-cotizaciones">
          <h2 id="ultimas-cotizaciones" className="mb-3 text-base font-semibold">
            Últimas cotizaciones
          </h2>
          <EmptyState
            icono={FileText}
            titulo="Aún no hay cotizaciones."
            descripcion="Crea la primera y aparecerá aquí con su estado."
            accion={
              <Button asChild variant="mint">
                <Link href="/panel/cotizaciones">Crear cotización</Link>
              </Button>
            }
          />
        </section>

        <section aria-labelledby="ultimas-fichas">
          <h2 id="ultimas-fichas" className="mb-3 text-base font-semibold">
            Últimas fichas técnicas
          </h2>
          <EmptyState
            icono={ClipboardList}
            titulo="Aún no hay fichas técnicas."
            descripcion="Registra un servicio y entrega la ficha a tu cliente."
            accion={
              <Button asChild variant="outline">
                <Link href="/panel/fichas">Crear ficha</Link>
              </Button>
            }
          />
        </section>

        <section aria-labelledby="mantenimientos" className="lg:col-span-2">
          <h2 id="mantenimientos" className="mb-3 text-base font-semibold">
            Mantenimientos próximos a vencer
          </h2>
          <EmptyState
            icono={CalendarClock}
            titulo="Nada por vencer en los próximos 30 días."
            descripcion="Cuando una ficha tenga fecha de próximo mantenimiento, te avisaremos aquí."
          />
        </section>

        <section aria-labelledby="leads" className="lg:col-span-2">
          <h2 id="leads" className="mb-3 text-base font-semibold">
            Leads recientes
          </h2>
          <EmptyState
            icono={Inbox}
            titulo="Sin mensajes nuevos."
            descripcion="Los mensajes del formulario de la landing llegarán a esta bandeja."
          />
        </section>
      </div>
    </>
  );
}
