"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

/** Select que guarda su valor en un parámetro de la URL (filtros de listas y calendario). */
export function SelectorParam({ param, opciones, etiqueta, todos, className }: { param: string; opciones: { valor: string; etiqueta: string }[]; etiqueta: string; todos: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <Select
      aria-label={etiqueta}
      className={className}
      value={params.get(param) ?? ""}
      onChange={(e) => {
        const nuevos = new URLSearchParams(params.toString());
        if (e.target.value) nuevos.set(param, e.target.value);
        else nuevos.delete(param);
        const q = nuevos.toString();
        router.push(q ? `${pathname}?${q}` : pathname);
      }}
    >
      <option value="">{todos}</option>
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.etiqueta}
        </option>
      ))}
    </Select>
  );
}
