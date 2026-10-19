"use client";

import { useEffect } from "react";

/** Pasado este tiempo, el CSS ya reveló los elementos por su cuenta (ver globals.css). */
const RED_DE_SEGURIDAD_MS = 2500;

/**
 * Revela al hacer scroll: observa todo `[data-revelar]` de la página y, cuando asoma, le pone la
 * clase `visible` (la animación está en globals.css). Los que entran en el mismo lote se escalonan
 * con `--retraso` según su orden en pantalla. Cada elemento se anima una sola vez. Si el JS llegó
 * después de la red de seguridad del CSS, marca sin animar para que nada parpadee. No pinta nada.
 */
export function Revelar() {
  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const nodos = Array.from(document.querySelectorAll<HTMLElement>("[data-revelar]"));
    if (!nodos.length) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        const lote = entradas
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const tarde = performance.now() > RED_DE_SEGURIDAD_MS;
        lote.forEach((e, i) => {
          const el = e.target as HTMLElement;
          if (tarde) el.style.animation = "none";
          else el.style.setProperty("--retraso", `${Math.min(i * 70, 350)}ms`);
          el.classList.add("visible");
          observador.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    nodos.forEach((n) => observador.observe(n));
    return () => observador.disconnect();
  }, []);
  return null;
}
