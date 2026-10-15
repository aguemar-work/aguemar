import { Check, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ESTADOS_DIAGNOSTICO, ESTADOS_FINALES, ESTADOS_INCIDENCIA, MODALIDADES, etiquetaDe, type FichaJson } from "@/lib/documentos";
import { formatearFecha } from "@/lib/format";

/**
 * La ficha técnica en pantalla, en el mismo orden que el PDF. Se usa en el panel,
 * en el workspace y en el portal público. Las secciones vacías no se muestran.
 */
export function VistaFicha({ f }: { f: FichaJson }) {
  const estado = ESTADOS_FINALES.find((e) => e.valor === f.estado_final)!;
  const equipo = f.equipo
    ? ([
        ["Marca y modelo", [f.equipo.marca, f.equipo.modelo].filter(Boolean).join(" ")],
        ["Serie", f.equipo.serie],
        ["Sistema operativo", f.equipo.sistema_operativo],
        ["Procesador", f.equipo.procesador],
        ["Memoria RAM", f.equipo.ram],
        ["Almacenamiento", f.equipo.almacenamiento],
        ["Gráfica", f.equipo.grafica],
        ["Batería", f.equipo.bateria],
        ["BIOS", f.equipo.bios],
      ].filter(([, v]) => v) as [string, string][])
    : [];
  let n = 0;
  const sig = () => String(n++).padStart(2, "0");

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-xl bg-ink p-6 text-white sm:p-8">
        <svg aria-hidden viewBox="0 0 200 120" className="pointer-events-none absolute -right-6 -top-4 w-48 text-mint opacity-[0.12]" fill="none">
          <path d="M70 10 L18 60 L70 110 M130 10 L182 60 L130 110" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="font-mono text-xs text-white/60">
          FICHA TÉCNICA · {f.numero} · {formatearFecha(f.fecha)}
        </p>
        <p className="mt-2 font-mono text-sm text-mint">{"// soporte técnico"}</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl">{f.titular}</h2>
        {f.resumen ? <p className="mt-3 max-w-2xl text-sm text-white/75">{f.resumen}</p> : null}
        <span
          className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            estado.variant === "ok" ? "bg-mint text-ink" : estado.variant === "warn" ? "bg-warning-bg text-warn" : "bg-danger-soft text-danger"
          }`}
        >
          {estado.etiqueta}
        </span>
      </header>

      {f.indicadores.length ? (
        <Seccion n={sig()} titulo="Indicadores clave">
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {f.indicadores.map((i, k) => (
              <div key={k} className="rounded-lg border border-border p-4">
                <dd className="font-mono text-2xl font-semibold text-mint-ink dark:text-mint">{i.valor}</dd>
                <dt className="text-xs text-muted-foreground">{i.etiqueta}</dt>
              </div>
            ))}
          </dl>
        </Seccion>
      ) : null}

      <Seccion n={sig()} titulo="Datos del servicio">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Dato k="Fecha" v={formatearFecha(f.fecha)} mono />
          <Dato k="Modalidad" v={`${etiquetaDe(MODALIDADES, f.modalidad)} · ${f.tipo_servicio}`} />
          <Dato k="Cliente" v={f.cliente.nombre} />
          <Dato k="Técnico" v={f.marca ? `${f.marca.responsable} · ${f.marca.nombre_comercial}` : "—"} />
        </dl>
      </Seccion>

      {equipo.length ? (
        <Seccion n={sig()} titulo="Ficha del equipo">
          <dl className="divide-y divide-border rounded-lg border border-border text-sm">
            {equipo.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2 sm:grid-cols-[12rem_1fr]">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={k === "Serie" || k === "BIOS" ? "font-mono" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>
        </Seccion>
      ) : null}

      {f.diagnosticos.length ? (
        <Seccion n={sig()} titulo="Diagnóstico inicial">
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {f.diagnosticos.map((d, k) => {
              const e = ESTADOS_DIAGNOSTICO.find((x) => x.valor === d.estado)!;
              return (
                <li key={k} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-medium sm:w-56 sm:shrink-0">{d.elemento}</span>
                  <span className="flex-1 text-muted-foreground">{d.resultado}</span>
                  <Badge variant={e.variant} className="self-start sm:self-center">
                    {e.etiqueta}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Seccion>
      ) : null}

      {f.trabajos.length ? (
        <Seccion n={sig()} titulo="Trabajos realizados">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {f.trabajos.map((t, k) => (
              <li key={k} className="rounded-lg border border-border p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  {t.hecho ? <Check className="size-4 text-mint-ink dark:text-mint" aria-label="Hecho" /> : <Circle className="size-4 text-muted-foreground" aria-label="Pendiente" />}
                  {t.titulo}
                </p>
                {t.detalle ? <p className="mt-1 text-xs text-muted-foreground">{t.detalle}</p> : null}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      {f.incidencias.length ? (
        <Seccion n={sig()} titulo="Incidencias atendidas">
          <ul className="grid gap-3 md:grid-cols-2">
            {f.incidencias.map((x, k) => {
              const e = ESTADOS_INCIDENCIA.find((y) => y.valor === x.estado)!;
              return (
                <li key={k} className="rounded-lg border border-border p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{x.titulo}</p>
                    <Badge variant={e.variant}>{e.etiqueta}</Badge>
                  </div>
                  {x.causa ? (
                    <p className="mt-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Causa</span>
                      <br />
                      {x.causa}
                    </p>
                  ) : null}
                  {x.solucion ? (
                    <p className="mt-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Solución</span>
                      <br />
                      {x.solucion}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Seccion>
      ) : null}

      {f.recomendaciones.length ? (
        <Seccion n={sig()} titulo="Recomendaciones">
          <ol className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {f.recomendaciones.map((r, k) => (
              <li key={k} className="flex gap-3">
                <span className="font-mono text-xs text-mint-ink dark:text-mint">{String(k + 1).padStart(2, "0")}</span>
                {r}
              </li>
            ))}
          </ol>
          {f.proximo_mantenimiento ? (
            <p className="mt-4 rounded-lg bg-soft p-3 text-sm dark:bg-secondary/50">
              Próximo mantenimiento sugerido: <span className="font-mono font-medium">{formatearFecha(f.proximo_mantenimiento)}</span>
            </p>
          ) : null}
        </Seccion>
      ) : null}
    </div>
  );
}

function Seccion({ n, titulo, children }: { n: string; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-3 flex items-baseline gap-2 text-base font-semibold">
        <span className="font-mono text-xs text-mint-ink dark:text-mint">{n}</span>
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Dato({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-soft p-3 dark:bg-secondary/50">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className={mono ? "font-mono" : undefined}>{v}</dd>
    </div>
  );
}
