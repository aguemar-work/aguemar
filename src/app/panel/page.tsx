import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlarmClock, CalendarClock, CheckCircle2, FileText, Inbox, KanbanSquare, ListTodo, MessageSquare, PauseCircle, Plus, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { conSesionOpcional } from "@/lib/datos/base";
import { obtenerRol } from "@/lib/insforge/server";
import { InicioEquipo } from "./inicio-equipo";
import { resumenInicio, type ResumenInicio } from "@/lib/datos/inicio";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { marcaIncompleta } from "@/lib/documentos";
import type { PerfilMarcaRow } from "@/types/database";
import { AREAS } from "@/lib/areas";
import { formatearFecha, formatearMonto, hoyLima } from "@/lib/format";
import { diasHasta, textoVencimiento } from "@/lib/trabajos-util";
import { cn } from "@/lib/utils";
import { infoTipo } from "@/lib/calendario";

const FECHA_LARGA = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const texto = FECHA_LARGA.format(new Date(Date.UTC(a, m - 1, d)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const TONO_TEXTO = {
  danger: "text-danger dark:text-red-300",
  warn: "text-warn dark:text-warning-foreground",
  ok: "text-muted-foreground",
  muted: "text-muted-foreground",
} as const;

export default async function InicioPanel() {
  // El colaborador tiene su propio inicio: sus empresas, sin dinero ni leads.
  if ((await obtenerRol()).tipo === "colaborador") return <InicioEquipo />;
  const sesion = await conSesionOpcional();
  // Resumen y marca en paralelo: una sola espera (InsForge está en us-east).
  const [r, marca]: [ResumenInicio | null, PerfilMarcaRow | null] = sesion ? await Promise.all([resumenInicio(), obtenerPerfilMarca()]) : [null, null];
  const faltanEnMarca = marcaIncompleta(marca);
  const hoy = r?.hoy ?? hoyLima();
  const activos = r ? r.por_estado.propuesta + r.por_estado.en_curso + r.por_estado.en_revision : 0;

  const alertas: Alerta[] = [
    { etiqueta: "Entregas vencidas", valor: r?.entregas_vencidas ?? 0, tono: "danger", icono: AlarmClock, href: "/panel/trabajos?foco=vencidas" },
    { etiqueta: "Entregan esta semana", valor: r?.entregas_semana ?? 0, tono: "warn", icono: CalendarClock, href: "/panel/trabajos?foco=semana" },
    { etiqueta: "Tareas vencidas", valor: r?.tareas_vencidas ?? 0, tono: "warn", icono: ListTodo, href: "/panel/trabajos?foco=tareas_vencidas" },
    { etiqueta: "Por responder", valor: (r?.comentarios_sin_leer ?? 0) + (r?.solicitudes_nuevas ?? 0), tono: "info", icono: MessageSquare, href: "/panel/bandeja" },
    { etiqueta: "Cotizaciones sin respuesta", valor: r?.cotizaciones_sin_respuesta ?? 0, tono: "info", icono: FileText, href: "/panel/cotizaciones" },
    {
      etiqueta: "Por cobrar",
      valor: r?.por_cobrar ?? 0,
      tono: r?.por_cobrar_vencido ? "danger" : "warn",
      icono: Wallet,
      href: "/panel/cotizaciones?estado=aceptada",
      monto: true,
      nota: r?.por_cobrar_vencido ? `${formatearMonto(r.por_cobrar_vencido)} vencido` : undefined,
    },
  ];
  const todoAlDia = alertas.every((a) => !a.valor) && (r?.detenidos.length ?? 0) === 0;

  return (
    <>
      <PageHeader
        codigo="00"
        titulo={fechaLarga(hoy)}
        descripcion={
          r
            ? `${activos} ${activos === 1 ? "trabajo activo" : "trabajos activos"} · ${r.empresas} ${r.empresas === 1 ? "empresa" : "empresas"} · ${r.empresas_con_acceso} con workspace`
            : "Resumen de lo que pide tu atención."
        }
        acciones={
          <>
            <Button asChild variant="mint">
              <Link href="/panel/cotizaciones/nueva">
                <Plus /> Nueva cotización
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/panel/trabajos/nuevo">
                <KanbanSquare /> Nuevo trabajo
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/panel/clientes/nuevo">
                <Users /> Nueva empresa
              </Link>
            </Button>
          </>
        }
      />

      {sesion && faltanEnMarca.length ? (
        <p role="status" className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-warn-soft px-4 py-3 text-sm text-warn dark:bg-warning-bg dark:text-warning-foreground">
          <AlarmClock className="size-4 shrink-0" aria-hidden />
          Completa Mi marca: a tus documentos les falta {faltanEnMarca.join(", ")}.
          <Link href="/panel/configuracion" className="font-medium underline underline-offset-4">
            Ir a Mi marca
          </Link>
        </p>
      ) : null}

      <section aria-label="Lo que pide atención" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {alertas.map((a) => (
          <TarjetaAlerta key={a.etiqueta} alerta={a} />
        ))}
      </section>

      {todoAlDia ? (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-success-bg px-4 py-3 text-sm text-success-foreground">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Todo al día: nada vencido ni sin responder.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
              <CardTitle>Entregas de las próximas dos semanas</CardTitle>
              <Link href="/panel/trabajos?vista=tablero" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Ver tablero
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {!r || r.entregas.length === 0 ? (
                <Vacio icono={KanbanSquare} texto="Sin entregas comprometidas en los próximos 14 días." />
              ) : (
                <ul className="divide-y divide-border">
                  {r.entregas.map((t) => {
                    const venc = textoVencimiento(t.fecha_compromiso, hoy);
                    const pct = t.tareas_total ? Math.round((t.tareas_hechas / t.tareas_total) * 100) : 0;
                    return (
                      <li key={t.id} className="flex items-center gap-4 py-3">
                        <div className="w-24 shrink-0">
                          <p className="font-mono text-xs tabular">{formatearFecha(t.fecha_compromiso)}</p>
                          <p className={cn("text-xs", TONO_TEXTO[venc.tono])}>{venc.texto}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link href={`/panel/trabajos/${t.id}`} className="block truncate font-medium underline-offset-4 hover:underline">
                            {t.titulo}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            <EtiquetaArea area={t.area} /> {t.empresa ? `· ${t.empresa}` : ""}
                          </p>
                        </div>
                        <div className="hidden w-28 shrink-0 sm:block" aria-label={`Avance ${pct} %`}>
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-mint-ink dark:bg-mint" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="mt-1 text-right font-mono text-[11px] text-muted-foreground">
                            {t.tareas_total ? `${t.tareas_hechas}/${t.tareas_total}` : "sin tareas"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {r && r.detenidos.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <PauseCircle className="size-4 text-warn dark:text-warning-foreground" aria-hidden /> Sin movimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {r.detenidos.map((t) => {
                    const dias = -(diasHasta(t.ultima_actividad.slice(0, 10), hoy) ?? 0);
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link href={`/panel/trabajos/${t.id}`} className="block truncate text-sm font-medium underline-offset-4 hover:underline">
                            {t.titulo}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            <EtiquetaArea area={t.area} /> {t.empresa ? `· ${t.empresa}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-warn dark:text-warning-foreground">{dias} días quieto</span>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
              <CardTitle>Cotizaciones esperando respuesta</CardTitle>
              {r && r.aceptado_mes > 0 ? (
                <span className="font-mono text-xs text-muted-foreground">Aceptado este mes: {formatearMonto(r.aceptado_mes)}</span>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              {!r || r.cotizaciones.length === 0 ? (
                <Vacio icono={FileText} texto="Nada esperando respuesta. Cuando envíes una cotización, aquí sabrás si sigue vigente." />
              ) : (
                <ul className="divide-y divide-border">
                  {r.cotizaciones.map((c) => {
                    const venc = textoVencimiento(c.vence, hoy);
                    return (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            <Link href={`/panel/cotizaciones/${c.id}`} className="underline-offset-4 hover:underline">
                              <span className="font-mono text-xs text-muted-foreground">{c.numero}</span> {c.asunto || c.empresa}
                            </Link>
                          </p>
                          <p className={cn("text-xs", TONO_TEXTO[venc.tono])}>
                            {c.empresa} · {venc.texto.replace("Vence", "Validez vence").replace("Vencido", "Validez vencida")}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm tabular">{formatearMonto(c.total, c.moneda)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
              <CardTitle>Esta semana</CardTitle>
              <Link href="/panel/calendario?vista=lista" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Calendario
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {!r || r.agenda.length === 0 ? (
                <Vacio icono={CalendarClock} texto="Nada agendado para los próximos 7 días." />
              ) : (
                <ul className="space-y-2">
                  {r.agenda.map((a) => (
                    <li key={a.id}>
                      <Link href={`/panel/calendario/${a.id}`} className="flex gap-3 rounded-md p-1.5 -m-1.5 hover:bg-soft/70 dark:hover:bg-secondary/40">
                        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                          {formatearFecha(a.fecha).slice(0, 5)}
                          {a.hora_inicio ? <span className="block">{a.hora_inicio}</span> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{a.titulo}</span>
                          <span className="text-xs text-muted-foreground">
                            {infoTipo(a.tipo).etiqueta}
                            {a.empresa ? ` · ${a.empresa}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>En qué estás</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {AREAS.map((a) => {
                const n = r?.por_area[a.valor] ?? 0;
                const pct = activos ? Math.round((n / activos) * 100) : 0;
                return (
                  <Link key={a.valor} href={`/panel/trabajos?area=${a.valor}`} className="block rounded-md p-1 -m-1 hover:bg-soft/70 dark:hover:bg-secondary/40">
                    <div className="flex items-baseline justify-between text-sm">
                      <span>{a.etiqueta}</span>
                      <span className="font-mono tabular">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-mint-ink dark:bg-mint" style={{ width: `${pct}%` }} />
                    </div>
                  </Link>
                );
              })}
              {r ? (
                <p className="pt-1 font-mono text-[11px] text-muted-foreground">
                  {r.por_estado.propuesta} propuesta · {r.por_estado.en_curso} en curso · {r.por_estado.en_revision} en revisión
                </p>
              ) : null}
            </CardContent>
          </Card>

          {r && r.deudores.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
                <CardTitle>Te deben</CardTitle>
                <span className="font-mono text-xs text-muted-foreground">{formatearMonto(r.por_cobrar)}</span>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {r.deudores.map((d) => (
                    <li key={`${d.cliente_id}-${d.moneda}`}>
                      <Link href={`/panel/clientes/${d.cliente_id}#cobros`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-foreground">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{d.empresa}</span>
                          <span className="block font-mono text-[11px] text-muted-foreground">
                            pagó {formatearMonto(d.cobrado, d.moneda)} de {formatearMonto(d.aceptado, d.moneda)}
                          </span>
                          {d.vencido > 0 ? (
                            <span className="block text-[11px] text-danger dark:text-red-300">
                              {formatearMonto(d.vencido, d.moneda)} vencido · {d.dias_atraso} {d.dias_atraso === 1 ? "día" : "días"} de atraso
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 font-mono tabular text-warn dark:text-warning-foreground">{formatearMonto(d.saldo, d.moneda)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
              <CardTitle>Sin leer</CardTitle>
              <Link href="/panel/bandeja" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                Bandeja
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {!r || (r.comentarios.length === 0 && r.solicitudes.length === 0) ? (
                <Vacio icono={Inbox} texto="Las empresas no te han escrito nada nuevo." />
              ) : (
                <ul className="space-y-3">
                  {r.solicitudes.map((s) => (
                    <li key={s.id}>
                      <Link href="/panel/bandeja" className="block rounded-md p-2 -m-2 hover:bg-soft/70 dark:hover:bg-secondary/40">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{s.empresa}</span> · solicitud nueva
                        </p>
                        <p className="line-clamp-2 text-sm">{s.titulo}</p>
                      </Link>
                    </li>
                  ))}
                  {r.comentarios.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={c.entidad === "trabajo" ? `/panel/trabajos/${c.entidad_id}#comentarios` : c.entidad === "actividad" ? `/panel/calendario/${c.entidad_id}` : c.entidad === "informe" ? `/panel/informes/${c.entidad_id}#comentarios` : "/panel/bandeja"}
                        className="block rounded-md p-2 -m-2 hover:bg-soft/70 dark:hover:bg-secondary/40"
                      >
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{c.empresa}</span>
                          {c.titulo ? ` · ${c.titulo}` : ""}
                        </p>
                        <p className="line-clamp-2 text-sm">{c.texto}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {r && r.mantenimientos.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Mantenimientos en 30 días</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {r.mantenimientos.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate">{m.empresa}</p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                          {m.modelo ?? "Equipo"} · {m.serie ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs">{formatearFecha(m.proximo_mantenimiento)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {r && r.leads_nuevos > 0 ? (
            <Link href="/panel/leads" className="block rounded-lg border border-border p-4 text-sm hover:border-mint-ink/40">
              <span className="font-mono font-semibold">{r.leads_nuevos}</span> {r.leads_nuevos === 1 ? "mensaje nuevo" : "mensajes nuevos"} desde la web.
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}

interface Alerta {
  etiqueta: string;
  valor: number | null;
  tono: "danger" | "warn" | "info";
  icono: LucideIcon;
  href: string;
  nota?: string;
  /** El valor es un monto en céntimos. */
  monto?: boolean;
}

function TarjetaAlerta({ alerta: a }: { alerta: Alerta }) {
  const activa = (a.valor ?? 0) > 0;
  const Icono = a.icono;
  return (
    <Link
      href={a.href}
      className={cn(
        "flex flex-col justify-between gap-3 rounded-lg border p-4 transition-colors",
        !activa && "border-border text-muted-foreground hover:border-mint-ink/40",
        activa && a.tono === "danger" && "border-danger/30 bg-danger-soft text-danger dark:bg-danger/20 dark:text-red-200",
        activa && a.tono === "warn" && "border-transparent bg-warning-bg text-warning-foreground",
        activa && a.tono === "info" && "border-mint-ink/30 bg-success-bg text-success-foreground",
      )}
    >
      <Icono className="size-4" aria-hidden />
      <div>
        <p className={cn("font-mono font-semibold tabular", a.monto ? "text-lg" : "text-2xl", !activa && "text-foreground/40")}>
          {a.valor == null ? "—" : a.monto ? formatearMonto(a.valor) : a.valor}
        </p>
        <p className="text-xs font-medium">{a.etiqueta}</p>
        {a.nota ? <p className="mt-0.5 text-[11px] opacity-80">{a.nota}</p> : null}
      </div>
    </Link>
  );
}

function Vacio({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <p className="flex items-center gap-3 rounded-md border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
      <Icono className="size-4 shrink-0" aria-hidden /> {texto}
    </p>
  );
}
