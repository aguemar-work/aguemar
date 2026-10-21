"use client";

import Link from "@/components/panel/enlace";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { valor: "", etiqueta: "Todas" },
  { valor: "borrador", etiqueta: "Borradores" },
  { valor: "enviada", etiqueta: "Enviadas" },
  { valor: "aceptada", etiqueta: "Aceptadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "vencida", etiqueta: "Vencidas" },
];

export function FiltrosCotizaciones({ clientes }: { clientes: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const estado = params.get("estado") ?? "";

  const enlace = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params.toString());
    if (valor) nuevos.set(clave, valor);
    else nuevos.delete(clave);
    const q = nuevos.toString();
    return q ? `${pathname}?${q}` : pathname;
  };

  return (
    <div className="mb-4 space-y-3">
      <nav aria-label="Estado" className="flex flex-wrap gap-1.5">
        {PESTANAS.map((p) => (
          <Link
            key={p.valor}
            href={enlace("estado", p.valor)}
            aria-current={estado === p.valor ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              estado === p.valor ? "border-transparent bg-ink text-white dark:bg-mint dark:text-ink" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {p.etiqueta}
          </Link>
        ))}
      </nav>
      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(enlace("q", String(new FormData(e.currentTarget).get("q") ?? "")));
        }}
      >
        <div className="relative sm:w-72">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" name="q" defaultValue={params.get("q") ?? ""} placeholder="Buscar por número o asunto" aria-label="Buscar cotización" className="pl-9" />
        </div>
        <Select aria-label="Empresa" value={params.get("cliente") ?? ""} onChange={(e) => router.push(enlace("cliente", e.target.value))} className="sm:w-56">
          <option value="">Todas las empresas</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </form>
    </div>
  );
}
