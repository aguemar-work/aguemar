"use client";

import { useEffect, useRef } from "react";

/**
 * Brillo mint muy tenue que sigue al puntero. Solo con mouse (`pointer: fine`) y sin
 * "reducir movimiento"; en los demás casos queda un div vacío y transparente.
 */
export function BrilloCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    let x = 0;
    let y = 0;
    let cuadro = 0;
    const pintar = () => {
      cuadro = 0;
      el.style.background = `radial-gradient(600px at ${x}px ${y}px, rgba(28, 231, 131, 0.06), transparent 80%)`;
    };
    const mover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!cuadro) cuadro = requestAnimationFrame(pintar);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(cuadro);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-30" />;
}
