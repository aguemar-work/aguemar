"use client";

import { useEffect, useState } from "react";
import type { Seccion } from "@/lib/landing-contenido";
import { cn } from "@/lib/utils";

/**
 * Menú de la columna izquierda: marca la sección que está en pantalla con una línea más larga
 * y `aria-current`. Arranca sin activa (así el HTML del servidor y el del cliente coinciden)
 * y la decide un IntersectionObserver: gana la primera sección, en orden del documento,
 * que cruza la franja del 20 % al 35 % de la ventana.
 */
export function MenuSecciones({ secciones }: { secciones: Seccion[] }) {
  const [activa, setActiva] = useState<string | null>(null);

  useEffect(() => {
    const nodos = secciones.map((s) => document.getElementById(s.id)).filter((n): n is HTMLElement => n !== null);
    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        const primera = secciones.find((s) => visibles.has(s.id));
        if (primera) setActiva(primera.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.5, 1] },
    );
    nodos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, [secciones]);

  return (
    <nav aria-label="Secciones" className="mt-16 hidden lg:block">
      <ul className="space-y-1">
        {secciones.map((s) => {
          const sel = s.id === activa;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={sel ? "location" : undefined} className="group flex items-center gap-4 rounded-sm py-2.5">
                <span aria-hidden className={cn("h-px transition-all duration-300", sel ? "w-16 bg-mint" : "w-8 bg-white/30 group-hover:w-16 group-hover:bg-white/80")} />
                <span className={cn("font-mono text-xs uppercase tracking-[0.2em] transition-colors", sel ? "text-white" : "text-white/55 group-hover:text-white")}>{s.texto}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
