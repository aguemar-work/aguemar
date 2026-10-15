import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { SelectorParam } from "@/components/panel/selector-param";
import { ListaAgenda, VistaMes, type ItemConEnlace } from "@/components/calendario/vistas";
import { Button } from "@/components/ui/button";
import { calendarioPanel } from "@/lib/datos/calendario";
import { opcionesClientes } from "@/lib/datos/clientes";
import { TIPOS_ACTIVIDAD, claveMes, leerMes, moverMes, nombreMes, rangoGrilla } from "@/lib/calendario";
import { hoyLima } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MarcarHecha } from "./marcar-hecha";

export const metadata: Metadata = { title: "Calendario" };

interface Props {
  searchParams: Promise<{ mes?: string; vista?: string; cliente?: string }>;
}

export default async function CalendarioPage({ searchParams }: Props) {
  const sp = await searchParams;
  const hoy = hoyLima();
  const { anio, mes } = leerMes(sp.mes, hoy);
  const vista = sp.vista === "lista" ? "lista" : "mes";
  const rango = vista === "mes" ? rangoGrilla(anio, mes) : { desde: `${claveMes(anio, mes)}-01`, hasta: new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10) };
  const [todos, clientes] = await Promise.all([calendarioPanel(rango.desde, rango.hasta), opcionesClientes()]);

  const items: ItemConEnlace[] = todos
    .filter((it) => !sp.cliente || it.cliente_id === sp.cliente)
    .map((it) => ({
      ...it,
      href: it.origen === "actividad" ? `/panel/calendario/${it.id}` : it.origen === "entrega" ? `/panel/trabajos/${it.id}` : `/panel/fichas/${it.id}`,
    }));

  const enlace = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const todosParams = { mes: claveMes(anio, mes), vista, cliente: sp.cliente, ...cambios };
    for (const [k, v] of Object.entries(todosParams)) if (v && !(k === "vista" && v === "mes")) p.set(k, v);
    return `/panel/calendario?${p.toString()}`;
  };
  const anterior = moverMes(anio, mes, -1);
  const siguiente = moverMes(anio, mes, 1);
  const nuevo = (fecha?: string) => `/panel/calendario/nueva?${new URLSearchParams({ ...(fecha ? { fecha } : {}), ...(sp.cliente ? { cliente: sp.cliente } : {}) }).toString()}`;

  return (
    <>
      <PageHeader
        codigo="05"
        titulo="Calendario"
        descripcion="Tus actividades, las entregas comprometidas de los trabajos y los mantenimientos sugeridos. Lo marcado visible lo ve cada empresa en su calendario."
        acciones={
          <Button asChild variant="mint">
            <Link href={nuevo()}>
              <Plus /> Nueva actividad
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1">
          <Button asChild variant="outline" size="icon" aria-label="Mes anterior">
            <Link href={enlace({ mes: claveMes(anterior.anio, anterior.mes) })}>
              <ChevronLeft />
            </Link>
          </Button>
          <h2 className="min-w-40 text-center text-lg font-semibold" aria-live="polite">
            {nombreMes(anio, mes)}
          </h2>
          <Button asChild variant="outline" size="icon" aria-label="Mes siguiente">
            <Link href={enlace({ mes: claveMes(siguiente.anio, siguiente.mes) })}>
              <ChevronRight />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={enlace({ mes: hoy.slice(0, 7) })}>Hoy</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SelectorParam param="cliente" etiqueta="Empresa" todos="Todas las empresas" opciones={clientes.map((c) => ({ valor: c.id, etiqueta: c.nombre }))} className="sm:w-52" />
          <div className="inline-flex rounded-md border border-border p-0.5" role="group" aria-label="Vista">
            {(
              [
                ["mes", "Mes", CalendarDays],
                ["lista", "Lista", List],
              ] as const
            ).map(([v, texto, Icono]) => (
              <Link
                key={v}
                href={enlace({ vista: v })}
                aria-current={vista === v ? "page" : undefined}
                className={cn("inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-sm", vista === v ? "bg-ink text-white dark:bg-mint dark:text-ink" : "text-muted-foreground hover:text-foreground")}
              >
                <Icono className="size-4" aria-hidden /> {texto}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {vista === "mes" ? (
        <>
          <div className="hidden sm:block">
            <VistaMes anio={anio} mes={mes} hoy={hoy} items={items} hrefNuevo={nuevo} />
          </div>
          <div className="sm:hidden">
            <ListaAgenda items={items.filter((i) => i.fecha.slice(0, 7) === claveMes(anio, mes))} hoy={hoy} vacio={<Vacio nuevo={nuevo()} />} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
            {TIPOS_ACTIVIDAD.map((t) => (
              <li key={t.valor} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", t.punto)} aria-hidden /> {t.etiqueta}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ListaAgenda
          items={items}
          hoy={hoy}
          vacio={<Vacio nuevo={nuevo()} />}
          acciones={(it) => (it.origen === "actividad" ? <MarcarHecha id={it.id} hecha={it.estado === "hecha"} titulo={it.titulo} /> : <span className="size-4 shrink-0" />)}
        />
      )}
    </>
  );
}

function Vacio({ nuevo }: { nuevo: string }) {
  return (
    <EmptyState
      icono={CalendarDays}
      titulo="Nada agendado este mes."
      descripcion="Agenda reuniones, publicaciones, mantenimientos o trabajos planificados. Las entregas de tus trabajos aparecen solas."
      accion={
        <Button asChild variant="mint">
          <Link href={nuevo}>
            <Plus /> Nueva actividad
          </Link>
        </Button>
      }
    />
  );
}
