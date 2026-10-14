"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AREAS } from "@/lib/areas";
import { formatearMonto } from "@/lib/format";
import type { ServicioRow } from "@/types/database";

/** Catálogo de servicios para agregar líneas: buscar, elegir, y la línea se llena sola. */
export function SelectorServicios({ servicios, onElegir }: { servicios: ServicioRow[]; onElegir: (s: ServicioRow) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");

  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    const filtrados = servicios.filter((s) => !t || s.nombre.toLowerCase().includes(t) || (s.descripcion ?? "").toLowerCase().includes(t));
    return AREAS.map((a) => ({ area: a, items: filtrados.filter((s) => s.area === a.valor) })).filter((g) => g.items.length > 0);
  }, [servicios, q]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button type="button" variant="mint">
          <Sparkles /> Desde mis servicios
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Agregar desde tus servicios</DialogTitle>
          <DialogDescription>Descripción, unidad y precio se llenan solos; luego puedes ajustarlos.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar servicio" aria-label="Buscar servicio" className="pl-9" autoFocus />
        </div>
        {servicios.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aún no tienes servicios. Créalos en Servicios y aparecerán aquí y en tu landing.
          </p>
        ) : grupos.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">Sin resultados para &ldquo;{q}&rdquo;.</p>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => (
              <section key={g.area.valor}>
                <h3 className="mb-1 font-mono text-xs text-mint-ink dark:text-mint">{g.area.rotulo}</h3>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-soft/70 focus-visible:bg-soft/70 dark:hover:bg-secondary/40"
                        onClick={() => {
                          onElegir(s);
                          setAbierto(false);
                          setQ("");
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{s.nombre}</span>
                          {s.descripcion ? <span className="line-clamp-1 text-xs text-muted-foreground">{s.descripcion}</span> : null}
                        </span>
                        <span className="shrink-0 text-right font-mono text-xs">
                          {s.precio_base != null ? formatearMonto(s.precio_base) : "sin precio"}
                          <span className="block text-muted-foreground">/ {s.unidad}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
