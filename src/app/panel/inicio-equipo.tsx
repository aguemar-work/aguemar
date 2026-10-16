import Link from "next/link";
import { AlarmClock, CalendarClock, ClipboardList, KanbanSquare, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resumenEquipo } from "@/lib/datos/equipo";
import { formatearFecha } from "@/lib/format";
import { infoTipo } from "@/lib/calendario";
import { cn } from "@/lib/utils";


/** Inicio del colaborador: solo lo de sus empresas, sin dinero. Una llamada (equipo_resumen). */
export async function InicioEquipo() {
  const r = await resumenEquipo();
  const empresas = r.empresas.map((e) => e.nombre).join(", ");

  return (
    <>
      <PageHeader
        codigo="00"
        titulo="Tu trabajo"
        descripcion={r.empresas.length ? `Empresas a tu cargo: ${empresas}.` : "Aún no tienes empresas asignadas. Pídele al propietario que te asigne una."}
        acciones={
          <>
            <Button asChild variant="mint">
              <Link href="/panel/fichas/nueva">
                <ClipboardList /> Nueva ficha
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/panel/calendario/nueva">
                <CalendarClock /> Agendar actividad
              </Link>
            </Button>
          </>
        }
      />

      <section aria-label="Lo que pide atención" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Tarjeta icono={KanbanSquare} etiqueta="Trabajos activos" valor={r.trabajos.length} href="/panel/trabajos" />
        <Tarjeta icono={AlarmClock} etiqueta="Tareas vencidas" valor={r.tareas_vencidas.length} href="/panel/trabajos" alerta={r.tareas_vencidas.length > 0} />
        <Tarjeta icono={MessageSquare} etiqueta="Comentarios sin leer" valor={r.comentarios} href="/panel/bandeja" alerta={r.comentarios > 0} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trabajos en curso</CardTitle>
          </CardHeader>
          <CardContent>
            {r.trabajos.length ? (
              <ul className="divide-y divide-border">
                {r.trabajos.map((t) => {
                  const avance = t.tareas ? Math.round((t.hechas / t.tareas) * 100) : 0;
                  return (
                    <li key={t.id} className="py-3">
                      <Link href={`/panel/trabajos/${t.id}`} className="group flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block font-medium group-hover:underline">{t.titulo}</span>
                          <span className="text-xs text-muted-foreground">
                            {t.empresa}
                            {t.fecha_compromiso ? ` · entrega ${formatearFecha(t.fecha_compromiso)}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <EtiquetaArea area={t.area} />
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.hechas}/{t.tareas} · {avance} %
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No hay trabajos activos en tus empresas.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Esta semana</CardTitle>
            </CardHeader>
            <CardContent>
              {r.agenda.length ? (
                <ul className="space-y-3">
                  {r.agenda.map((a) => (
                    <li key={a.id}>
                      <Link href={`/panel/calendario/${a.id}`} className="block rounded-md hover:underline">
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatearFecha(a.fecha)}
                          {a.hora_inicio ? ` · ${a.hora_inicio.slice(0, 5)}` : ""} · {infoTipo(a.tipo).etiqueta}
                        </span>
                        <span className="block text-sm font-medium">{a.titulo}</span>
                        <span className="text-xs text-muted-foreground">{a.empresa}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nada agendado para los próximos 7 días.</p>
              )}
            </CardContent>
          </Card>

          {r.tareas_vencidas.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tareas vencidas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {r.tareas_vencidas.map((x) => (
                    <li key={x.id}>
                      <Link href={`/panel/trabajos/${x.trabajo_id}`} className="block hover:underline">
                        <span className="block text-sm font-medium">{x.titulo}</span>
                        <span className="text-xs text-danger dark:text-red-300">
                          {x.trabajo} · {x.empresa} · venció el {formatearFecha(x.fecha_limite)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Tarjeta({ icono: Icono, etiqueta, valor, href, alerta }: { icono: typeof KanbanSquare; etiqueta: string; valor: number; href: string; alerta?: boolean }) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/30">
      <Icono className="size-4 text-muted-foreground" aria-hidden />
      <p className={cn("mt-2 font-mono text-2xl", alerta ? "text-warn dark:text-warning-foreground" : "text-foreground")}>{valor}</p>
      <p className="text-sm text-muted-foreground">{etiqueta}</p>
    </Link>
  );
}

