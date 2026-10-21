"use client";

import { useTransition } from "react";
import Link from "next/link";
import { avisoError } from "@/lib/avisos";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { ESTADOS_TRABAJO } from "@/lib/areas";
import { formatearFecha } from "@/lib/format";
import { calcularAvance, textoVencimiento } from "@/lib/trabajos-util";
import type { TrabajoResumen } from "@/lib/datos/trabajos";
import type { EstadoTrabajo } from "@/types/database";
import { cambiarEstadoTrabajo } from "./acciones";

const COLUMNAS: EstadoTrabajo[] = ["propuesta", "en_curso", "en_revision", "entregado", "cerrado"];

/** Con `soloLectura` (colaborador) no se mueven tarjetas: el estado del trabajo lo cambia el propietario. */
export function Tablero({ trabajos, hoy, soloLectura = false }: { trabajos: TrabajoResumen[]; hoy: string; soloLectura?: boolean }) {
  const [pendiente, iniciar] = useTransition();

  const mover = (id: string, estado: EstadoTrabajo) =>
    iniciar(async () => {
      const r = await cambiarEstadoTrabajo(id, estado);
      if (!r.ok) avisoError(r.error);
    });

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      <div className="grid min-w-[1100px] grid-cols-5 gap-3">
        {COLUMNAS.map((estado, ci) => {
          const info = ESTADOS_TRABAJO.find((e) => e.valor === estado)!;
          const items = trabajos.filter((t) => t.estado === estado);
          return (
            <section key={estado} aria-labelledby={`col-${estado}`} className="flex flex-col rounded-lg bg-soft/70 p-2 dark:bg-secondary/40">
              <h3 id={`col-${estado}`} className="flex items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {info.etiqueta}
                <span className="font-mono">{items.length}</span>
              </h3>
              <ul className="flex flex-1 flex-col gap-2">
                {items.map((t) => {
                  const avance = calcularAvance(t.trabajo_tareas ?? []);
                  const venc = textoVencimiento(t.fecha_compromiso, hoy);
                  return (
                    <li key={t.id} className="rounded-md border border-border bg-card p-3 shadow-xs">
                      <EtiquetaArea area={t.area} />
                      <Link href={`/panel/trabajos/${t.id}`} className="mt-1 block text-sm font-medium leading-snug underline-offset-4 hover:underline">
                        {t.titulo}
                      </Link>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{t.clientes?.nombre ?? "Sin cliente"}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                        <span className={venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}>
                          {t.fecha_compromiso ? `${formatearFecha(t.fecha_compromiso)} · ${venc.texto}` : "Sin fecha"}
                        </span>
                        {avance.total > 0 ? (
                          <Badge variant={avance.porcentaje === 100 ? "ok" : "outline"} className="font-mono">
                            {avance.hechas}/{avance.total}
                          </Badge>
                        ) : null}
                      </div>
                      {soloLectura ? null : (
                      <div className="mt-2 flex justify-between">
                        <Button variant="ghost" size="sm" className="h-7 px-2" disabled={ci === 0 || pendiente} aria-label="Mover a la columna anterior" onClick={() => mover(t.id, COLUMNAS[ci - 1])}>
                          <ChevronLeft className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2" disabled={ci === COLUMNAS.length - 1 || pendiente} aria-label="Mover a la siguiente columna" onClick={() => mover(t.id, COLUMNAS[ci + 1])}>
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 ? <li className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Nada aquí</li> : null}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
