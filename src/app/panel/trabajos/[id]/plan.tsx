"use client";

import { createContext, useContext, useOptimistic, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { ArrowDown, ArrowUp, Check, ListChecks, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatearFecha } from "@/lib/format";
import { calcularAvance, textoVencimiento } from "@/lib/trabajos-util";
import type { TrabajoEtapaRow, TrabajoTareaRow } from "@/types/database";
import {
  agregarEtapa,
  agregarTarea,
  editarTarea,
  eliminarEtapa,
  eliminarTarea,
  marcarEtapa,
  marcarTarea,
  renombrarEtapa,
  reordenarEtapas,
} from "../acciones";

interface Props {
  trabajoId: string;
  etapas: TrabajoEtapaRow[];
  tareas: TrabajoTareaRow[];
  hoy: string;
  /** false para el colaborador: trabaja tareas, pero no crea, mueve, renombra, marca ni borra etapas. */
  gestionaEtapas?: boolean;
}

/** Etapas con sus tareas, editables en línea. Las tareas sin etapa van en "General". */
/** Marcar etapas y tareas se ve al instante (optimista); si falla, vuelve atrás y avisa. */
const Alternar = createContext<{ tarea: (id: string, hecha: boolean) => void; etapa: (id: string, hecha: boolean) => void; gestionaEtapas: boolean }>({
  tarea: () => {},
  etapa: () => {},
  gestionaEtapas: true,
});

type Cambio = { id: string; hecha: boolean };
const aplicar = <T extends { id: string; hecha: boolean }>(lista: T[], c: Cambio) => lista.map((x) => (x.id === c.id ? { ...x, hecha: c.hecha } : x));

export function Plan({ trabajoId, etapas: etapasServidor, tareas: tareasServidor, hoy, gestionaEtapas = true }: Props) {
  const [pendiente, iniciar] = useTransition();
  const [, iniciarMarca] = useTransition();
  const [tareas, marcarTareaOptimista] = useOptimistic(tareasServidor, aplicar<TrabajoTareaRow>);
  const [etapas, marcarEtapaOptimista] = useOptimistic(etapasServidor, aplicar<TrabajoEtapaRow>);
  const [nuevaEtapa, setNuevaEtapa] = useState("");
  const avance = calcularAvance(tareas);

  const alternar = {
    tarea: (id: string, hecha: boolean) =>
      iniciarMarca(async () => {
        marcarTareaOptimista({ id, hecha });
        const r = await marcarTarea(id, trabajoId, hecha);
        if (!r.ok) avisoError(r.error ?? "No se pudo marcar la tarea.");
      }),
    etapa: (id: string, hecha: boolean) =>
      iniciarMarca(async () => {
        marcarEtapaOptimista({ id, hecha });
        const r = await marcarEtapa(id, trabajoId, hecha);
        if (!r.ok) avisoError(r.error ?? "No se pudo marcar la etapa.");
      }),
    gestionaEtapas,
  };

  const ejecutar = (fn: () => Promise<{ ok: boolean; error?: string }>, exitoMsg?: string) =>
    iniciar(async () => {
      const r = await fn();
      if (!r.ok) avisoError(r.error ?? "No se pudo completar.");
      else if (exitoMsg) toast.success(exitoMsg);
    });

  const crearEtapa = (e: FormEvent) => {
    e.preventDefault();
    const titulo = nuevaEtapa.trim();
    if (!titulo) return;
    ejecutar(async () => {
      const r = await agregarEtapa(trabajoId, titulo);
      if (r.ok) setNuevaEtapa("");
      return r;
    });
  };

  const moverEtapa = (indice: number, dir: -1 | 1) => {
    const destino = indice + dir;
    if (destino < 0 || destino >= etapas.length) return;
    const ids = etapas.map((e) => e.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    ejecutar(() => reordenarEtapas(trabajoId, ids));
  };

  const sinEtapa = tareas.filter((t) => !t.etapa_id || !etapas.some((e) => e.id === t.etapa_id));

  return (
    <Alternar.Provider value={alternar}>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Plan de trabajo</CardTitle>
            <CardDescription>Etapas y tareas. Marca lo hecho; el avance se calcula solo.</CardDescription>
          </div>
          <Badge variant={avance.total > 0 && avance.porcentaje === 100 ? "ok" : "outline"} className="font-mono">
            {avance.hechas}/{avance.total} · {avance.porcentaje} %
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          {etapas.length === 0 && tareas.length === 0 ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              <ListChecks className="size-5 shrink-0" aria-hidden />
              {gestionaEtapas ? "Sin plan todavía. Crea una etapa, por ejemplo Diagnóstico o Diseño, y agrégale tareas." : "Sin plan todavía. Agrega las tareas que vas a hacer."}
            </div>
          ) : null}

          {etapas.map((etapa, i) => (
            <Etapa
              key={etapa.id}
              etapa={etapa}
              tareas={tareas.filter((t) => t.etapa_id === etapa.id)}
              hoy={hoy}
              trabajoId={trabajoId}
              pendiente={pendiente}
              ejecutar={ejecutar}
              onSubir={i > 0 ? () => moverEtapa(i, -1) : undefined}
              onBajar={i < etapas.length - 1 ? () => moverEtapa(i, 1) : undefined}
            />
          ))}

          {sinEtapa.length > 0 ? (
            <section>
              <h4 className="mb-2 text-sm font-semibold">General</h4>
              <ListaTareas tareas={sinEtapa} hoy={hoy} trabajoId={trabajoId} pendiente={pendiente} ejecutar={ejecutar} />
            </section>
          ) : null}

          {etapas.length === 0 ? (
            <NuevaTarea trabajoId={trabajoId} etapaId={null} pendiente={pendiente} ejecutar={ejecutar} />
          ) : null}

          {gestionaEtapas ? (
            <form onSubmit={crearEtapa} className="flex gap-2 border-t border-border pt-4">
              <Input value={nuevaEtapa} onChange={(e) => setNuevaEtapa(e.target.value)} placeholder="Nueva etapa, p. ej. Diagnóstico" aria-label="Nueva etapa" />
              <Button type="submit" variant="outline" disabled={pendiente || !nuevaEtapa.trim()}>
                <Plus /> Etapa
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </Alternar.Provider>
  );
}

type Ejecutar = (fn: () => Promise<{ ok: boolean; error?: string }>, exitoMsg?: string) => void;

function Etapa({
  etapa,
  tareas,
  hoy,
  trabajoId,
  pendiente,
  ejecutar,
  onSubir,
  onBajar,
}: {
  etapa: TrabajoEtapaRow;
  tareas: TrabajoTareaRow[];
  hoy: string;
  trabajoId: string;
  pendiente: boolean;
  ejecutar: Ejecutar;
  onSubir?: () => void;
  onBajar?: () => void;
}) {
  const alternar = useContext(Alternar);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(etapa.titulo);
  const avance = calcularAvance(tareas);
  const hecha = etapa.hecha || (avance.total > 0 && avance.porcentaje === 100);

  return (
    <section className="rounded-md border border-border">
      <header className="flex items-center gap-2 border-b border-border bg-soft/60 px-3 py-2 dark:bg-secondary/40">
        <input
          type="checkbox"
          className="size-4 accent-mint-ink dark:accent-mint"
          checked={etapa.hecha}
          disabled={!alternar.gestionaEtapas}
          aria-label={`Marcar etapa ${etapa.titulo} como hecha`}
          onChange={(e) => alternar.etapa(etapa.id, e.target.checked)}
        />
        {editando ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ejecutar(async () => {
                const r = await renombrarEtapa(etapa.id, trabajoId, titulo);
                if (r.ok) setEditando(false);
                return r;
              });
            }}
          >
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-8" aria-label="Nombre de la etapa" autoFocus />
            <Button type="submit" size="sm" variant="mint" className="h-8" disabled={pendiente}>
              <Check />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditando(false)}>
              <X />
            </Button>
          </form>
        ) : (
          <h4 className={`flex-1 text-sm font-semibold ${hecha ? "text-muted-foreground line-through" : ""}`}>{etapa.titulo}</h4>
        )}
        <span className="font-mono text-xs text-muted-foreground">
          {avance.hechas}/{avance.total}
        </span>
        {alternar.gestionaEtapas ? (
        <div className="flex gap-0.5">
          <Button variant="ghost" size="icon" className="size-7" aria-label="Subir etapa" disabled={!onSubir || pendiente} onClick={onSubir}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Bajar etapa" disabled={!onBajar || pendiente} onClick={onBajar}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label="Renombrar etapa" onClick={() => setEditando(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Eliminar etapa"
            disabled={pendiente}
            onClick={() => {
              if (tareas.length > 0 && !window.confirm(`La etapa "${etapa.titulo}" tiene ${tareas.length} tareas que también se eliminarán. ¿Continuar?`)) return;
              ejecutar(() => eliminarEtapa(etapa.id, trabajoId), "Etapa eliminada.");
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
        ) : null}
      </header>
      <div className="space-y-2 p-3">
        <ListaTareas tareas={tareas} hoy={hoy} trabajoId={trabajoId} pendiente={pendiente} ejecutar={ejecutar} />
        <NuevaTarea trabajoId={trabajoId} etapaId={etapa.id} pendiente={pendiente} ejecutar={ejecutar} />
      </div>
    </section>
  );
}

function ListaTareas({ tareas, hoy, trabajoId, pendiente, ejecutar }: { tareas: TrabajoTareaRow[]; hoy: string; trabajoId: string; pendiente: boolean; ejecutar: Ejecutar }) {
  if (tareas.length === 0) return null;
  return (
    <ul className="space-y-1">
      {tareas.map((t) => (
        <Tarea key={t.id} tarea={t} hoy={hoy} trabajoId={trabajoId} pendiente={pendiente} ejecutar={ejecutar} />
      ))}
    </ul>
  );
}

function Tarea({ tarea, hoy, trabajoId, pendiente, ejecutar }: { tarea: TrabajoTareaRow; hoy: string; trabajoId: string; pendiente: boolean; ejecutar: Ejecutar }) {
  const alternar = useContext(Alternar);
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(tarea.titulo);
  const [fecha, setFecha] = useState(tarea.fecha_limite ?? "");
  const venc = textoVencimiento(tarea.fecha_limite, hoy);

  if (editando) {
    return (
      <li>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar(async () => {
              const r = await editarTarea(tarea.id, trabajoId, { titulo, fecha_limite: fecha || null });
              if (r.ok) setEditando(false);
              return r;
            });
          }}
        >
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-8 flex-1" aria-label="Tarea" autoFocus />
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-8 font-mono sm:w-40" aria-label="Fecha límite" />
          <div className="flex gap-1">
            <Button type="submit" size="sm" variant="mint" className="h-8" disabled={pendiente}>
              <Check />
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setEditando(false)}>
              <X />
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-soft/60 dark:hover:bg-secondary/40">
      <input
        type="checkbox"
        className="size-4 accent-mint-ink dark:accent-mint"
        checked={tarea.hecha}
        aria-label={`Marcar tarea ${tarea.titulo}`}
        onChange={(e) => alternar.tarea(tarea.id, e.target.checked)}
      />
      <span className={`flex-1 text-sm ${tarea.hecha ? "text-muted-foreground line-through" : ""}`}>{tarea.titulo}</span>
      {tarea.fecha_limite && !tarea.hecha ? (
        <span className={`text-xs ${venc.tono === "danger" ? "text-danger" : venc.tono === "warn" ? "text-warn dark:text-warning-foreground" : "text-muted-foreground"}`}>
          {formatearFecha(tarea.fecha_limite)}
        </span>
      ) : null}
      <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Editar tarea" onClick={() => setEditando(true)}>
        <Pencil className="size-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Eliminar tarea"
        disabled={pendiente}
        onClick={() => ejecutar(() => eliminarTarea(tarea.id, trabajoId))}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </li>
  );
}

function NuevaTarea({ trabajoId, etapaId, pendiente, ejecutar }: { trabajoId: string; etapaId: string | null; pendiente: boolean; ejecutar: Ejecutar }) {
  const [titulo, setTitulo] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = titulo.trim();
        if (!t) return;
        ejecutar(async () => {
          const r = await agregarTarea(trabajoId, { titulo: t, etapa_id: etapaId });
          if (r.ok) setTitulo("");
          return r;
        });
      }}
    >
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Nueva tarea" aria-label="Nueva tarea" className="h-8" />
      <Button type="submit" size="sm" variant="outline" className="h-8" disabled={pendiente || !titulo.trim()}>
        {pendiente ? <Loader2 className="animate-spin" /> : <Plus />} Tarea
      </Button>
    </form>
  );
}
