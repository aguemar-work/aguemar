import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { ListaAgenda, VistaMes, type ItemConEnlace } from "@/components/calendario/vistas";
import { Button } from "@/components/ui/button";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { TIPOS_ACTIVIDAD, claveMes, leerMes, moverMes, nombreMes, rangoGrilla } from "@/lib/calendario";
import { hoyLima } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendario" };

export default async function CalendarioWorkspace({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mes?: string; vista?: string }> }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const hoy = hoyLima();
  const { anio, mes } = leerMes(sp.mes, hoy);
  const vista = sp.vista === "lista" ? "lista" : "mes";
  const rango = rangoGrilla(anio, mes);
  const [empresa, datos] = await Promise.all([ws.miEmpresa(), ws.calendario(rango.desde, rango.hasta)]);
  if (!moduloActivo(empresa?.modulos, "calendario")) notFound();
  const conProyectos = moduloActivo(empresa?.modulos, "proyectos");

  const items: ItemConEnlace[] = datos.map((it) => ({
    ...it,
    href: it.origen === "actividad" ? `/w/${slug}/calendario/${it.id}` : conProyectos ? `/w/${slug}/proyectos/${it.id}` : null,
  }));
  const delMes = items.filter((i) => i.fecha.slice(0, 7) === claveMes(anio, mes));
  const enlace = (cambios: { mes?: string; vista?: string }) => {
    const p = new URLSearchParams({ mes: cambios.mes ?? claveMes(anio, mes) });
    const v = cambios.vista ?? vista;
    if (v === "lista") p.set("vista", "lista");
    return `/w/${slug}/calendario?${p.toString()}`;
  };
  const anterior = moverMes(anio, mes, -1);
  const siguiente = moverMes(anio, mes, 1);
  const vacio = <EmptyState icono={CalendarDays} titulo="Nada agendado este mes." descripcion="Aquí verás las reuniones, publicaciones, mantenimientos y entregas que planifiquemos contigo." />;

  return (
    <>
      <PageHeader codigo="01" titulo="Calendario" descripcion="Lo que tenemos planificado contigo. Abre una actividad para ver el detalle o comentar." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="inline-flex self-start rounded-md border border-border p-0.5" role="group" aria-label="Vista">
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

      {vista === "mes" ? (
        <>
          <div className="hidden sm:block">
            <VistaMes anio={anio} mes={mes} hoy={hoy} items={items} />
          </div>
          <div className="sm:hidden">
            <ListaAgenda items={delMes} hoy={hoy} vacio={vacio} />
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda">
            {TIPOS_ACTIVIDAD.filter((t) => t.valor !== "otro").map((t) => (
              <li key={t.valor} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", t.punto)} aria-hidden /> {t.etiqueta}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <ListaAgenda items={delMes} hoy={hoy} vacio={vacio} />
      )}
    </>
  );
}
