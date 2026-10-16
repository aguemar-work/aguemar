"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const formatoHora = new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });

/** Hora actual en Perú. La landing es estática: la hora se pone en el navegador. */
export function HoraPeru() {
  const [hora, setHora] = useState<string | null>(null);
  useEffect(() => {
    const poner = () => setHora(formatoHora.format(new Date()));
    poner();
    const id = window.setInterval(poner, 20_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="tabular" aria-live="off">
      {hora ?? "--:--"}
    </span>
  );
}

/** Envoltura "magnética": el contenido se acerca un poco al cursor. Solo con mouse y sin "reducir movimiento". */
export function Magnetico({ children, fuerza = 0.28 }: { children: ReactNode; fuerza?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * fuerza;
      const y = (e.clientY - (r.top + r.height / 2)) * fuerza;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    };
    const soltar = () => {
      el.style.transform = "";
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", soltar);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", soltar);
    };
  }, [fuerza]);
  return (
    <span ref={ref} className="inline-flex transition-transform duration-300 ease-out will-change-transform">
      {children}
    </span>
  );
}
