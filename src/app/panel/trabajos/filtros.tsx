"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutList, KanbanSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AREAS, ESTADOS_TRABAJO } from "@/lib/areas";

interface Props {
  clientes: { id: string; nombre: string }[];
  vista: "lista" | "tablero";
}

export function FiltrosTrabajos({ clientes, vista }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const actualizar = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    router.push(`${pathname}?${nuevos.toString()}`);
  };

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          actualizar("q", String(q ?? ""));
        }}
      >
        <div className="relative sm:w-64">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={params.get("q") ?? ""} placeholder="Buscar trabajo" aria-label="Buscar trabajo" className="pl-9" />
        </div>
        <Select aria-label="Área" value={params.get("area") ?? ""} onChange={(e) => actualizar("area", e.target.value)} className="sm:w-44">
          <option value="">Todas las áreas</option>
          {AREAS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.etiqueta}
            </option>
          ))}
        </Select>
        <Select aria-label="Estado" value={params.get("estado") ?? "activos"} onChange={(e) => actualizar("estado", e.target.value)} className="sm:w-44">
          <option value="activos">Activos</option>
          <option value="todos">Todos</option>
          {ESTADOS_TRABAJO.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.etiqueta}
            </option>
          ))}
        </Select>
        <Select aria-label="Cliente" value={params.get("cliente") ?? ""} onChange={(e) => actualizar("cliente", e.target.value)} className="sm:w-48">
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </form>

      <div role="group" aria-label="Vista" className="flex rounded-md border border-border p-0.5">
        <Button variant={vista === "lista" ? "secondary" : "ghost"} size="sm" onClick={() => actualizar("vista", "lista")} aria-pressed={vista === "lista"}>
          <LayoutList /> Lista
        </Button>
        <Button variant={vista === "tablero" ? "secondary" : "ghost"} size="sm" onClick={() => actualizar("vista", "tablero")} aria-pressed={vista === "tablero"}>
          <KanbanSquare /> Tablero
        </Button>
      </div>
    </div>
  );
}
