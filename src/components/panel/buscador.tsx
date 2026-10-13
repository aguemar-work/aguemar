"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BuscadorProps {
  placeholder: string;
  valorInicial?: string;
  /** Parámetros extra que deben conservarse en la URL. */
  ocultos?: Record<string, string | undefined>;
}

/** Formulario GET que escribe ?q= en la URL; la página lo lee en el servidor. */
export function Buscador({ placeholder, valorInicial, ocultos }: BuscadorProps) {
  return (
    <form method="get" role="search" className="relative w-full sm:max-w-xs">
      {Object.entries(ocultos ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        name="q"
        defaultValue={valorInicial}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </form>
  );
}
