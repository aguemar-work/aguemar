import Link from "next/link";
import { Plus } from "lucide-react";
import { DIAS_SEMANA, infoTipo, porDia, semanasDelMes, textoHoras, type ItemCalendario } from "@/lib/calendario";
import { cn } from "@/lib/utils";

export type ItemConEnlace = ItemCalendario & { href?: string | null };

const FECHA_LARGA = new Intl.DateTimeFormat("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
function fechaLarga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const t = FECHA_LARGA.format(new Date(Date.UTC(a, m - 1, d)));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function Pastilla({ it, compacta }: { it: ItemConEnlace; compacta?: boolean }) {
  const tipo = infoTipo(it.tipo);
  const hecha = it.estado !== "planificada";
  const contenido = (
    <>
      <span className={cn("size-1.5 shrink-0 rounded-full", tipo.punto)} aria-hidden />
      {it.hora_inicio ? <span className="font-mono text-[10px] text-muted-foreground">{it.hora_inicio}</span> : null}
      <span className={cn("truncate", hecha && "line-through opacity-60")}>{it.titulo}</span>
    </>
  );
  const clases = cn("flex min-h-6 items-center gap-1 rounded px-1 py-1 text-[11px] leading-tight", compacta ? "" : "hover:bg-soft dark:hover:bg-secondary/60");
  return it.href ? (
    <Link href={it.href} className={clases} title={`${tipo.etiqueta}: ${it.titulo}`}>
      {contenido}
    </Link>
  ) : (
    <span className={clases} title={`${tipo.etiqueta}: ${it.titulo}`}>
      {contenido}
    </span>
  );
}

/**
 * Grilla del mes (lunes a domingo). En pantallas chicas se reemplaza por la lista,
 * que se lee mejor que siete columnas estrechas.
 */
export function VistaMes({
  anio,
  mes,
  hoy,
  items,
  hrefNuevo,
  maxPorDia = 3,
}: {
  anio: number;
  mes: number;
  hoy: string;
  items: ItemConEnlace[];
  /** Enlace para crear una actividad en ese día (solo en el panel). */
  hrefNuevo?: (fecha: string) => string;
  maxPorDia?: number;
}) {
  const semanas = semanasDelMes(anio, mes);
  const dias = porDia(items);

  return (
    <div className="overflow-hidden rounded-lg border border-border" role="table" aria-label="Calendario del mes">
      <div className="grid grid-cols-7 border-b border-border bg-soft/70 text-center text-xs font-medium text-muted-foreground dark:bg-secondary/40" role="row">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-2" role="columnheader">
            {d}
          </div>
        ))}
      </div>
      {semanas.map((sem, i) => (
        <div key={i} className="grid grid-cols-7 border-b border-border last:border-b-0" role="row">
          {sem.map((d) => {
            const del = dias.get(d.fecha) ?? [];
            const visibles = del.slice(0, maxPorDia);
            const esHoy = d.fecha === hoy;
            return (
              <div
                key={d.fecha}
                role="cell"
                aria-label={`${fechaLarga(d.fecha)}: ${del.length} ${del.length === 1 ? "evento" : "eventos"}`}
                className={cn("group relative min-h-24 border-r border-border p-1 last:border-r-0", !d.delMes && "bg-soft/40 dark:bg-secondary/20")}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full font-mono text-xs",
                      esHoy ? "bg-mint-ink font-semibold text-white dark:bg-mint dark:text-ink" : d.delMes ? "text-foreground" : "text-muted-foreground/80",
                    )}
                  >
                    {d.dia}
                  </span>
                  {hrefNuevo ? (
                    <Link
                      href={hrefNuevo(d.fecha)}
                      className="rounded p-1.5 text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label={`Nueva actividad el ${fechaLarga(d.fecha)}`}
                    >
                      <Plus className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {visibles.map((it) => (
                    <Pastilla key={`${it.origen}-${it.id}`} it={it} />
                  ))}
                  {del.length > maxPorDia ? <p className="px-1 text-[10px] text-muted-foreground">+{del.length - maxPorDia} más</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Agenda en lista, agrupada por día. `acciones` agrega controles por ítem (p. ej. marcar hecha). */
export function ListaAgenda({
  items,
  hoy,
  vacio,
  acciones,
}: {
  items: ItemConEnlace[];
  hoy: string;
  vacio: React.ReactNode;
  acciones?: (it: ItemConEnlace) => React.ReactNode;
}) {
  if (items.length === 0) return <>{vacio}</>;
  const dias = [...porDia(items).entries()];
  return (
    <div className="space-y-5">
      {dias.map(([fecha, lista]) => (
        <section key={fecha} aria-label={fechaLarga(fecha)}>
          <h3 className={cn("mb-2 text-sm font-semibold", fecha === hoy && "text-mint-ink dark:text-mint")}>
            {fechaLarga(fecha)}
            {fecha === hoy ? <span className="ml-2 font-mono text-xs font-normal">hoy</span> : null}
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lista.map((it) => {
              const tipo = infoTipo(it.tipo);
              const hecha = it.estado !== "planificada";
              const cuerpo = (
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-medium", hecha && "text-muted-foreground line-through")}>{it.titulo}</p>
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span className={cn("size-1.5 rounded-full", tipo.punto)} aria-hidden /> {tipo.etiqueta}
                    </span>
                    {it.hora_inicio ? <span className="font-mono">{textoHoras(it.hora_inicio, it.hora_fin)}</span> : null}
                    {it.empresa ? <span>{it.empresa}</span> : null}
                    {it.lugar ? <span className="truncate">{it.lugar}</span> : null}
                    {it.estado === "cancelada" ? <span>cancelada</span> : null}
                  </p>
                </div>
              );
              return (
                <li key={`${it.origen}-${it.id}`} className="flex items-center gap-3 px-3 py-2.5">
                  {acciones ? acciones(it) : null}
                  {it.href ? (
                    <Link href={it.href} className="min-w-0 flex-1 rounded hover:underline-offset-4">
                      {cuerpo}
                    </Link>
                  ) : (
                    cuerpo
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
