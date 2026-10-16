"use client";

import { useEffect, useRef, useState } from "react";
import { cantidadParticulas, puedeAnimar } from "@/lib/escena/recorrido";

function hayWebgl() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Fondo 3D de la landing: un canvas fijo detrás de todo. Three.js se descarga después
 * de que la página ya se ve, y solo si conviene (sin "reducir movimiento", con WebGL,
 * sin ahorro de datos y en un equipo con al menos 4 núcleos). Si no, quedan los corchetes en SVG.
 *
 * Con la escena activa, `html.escena-3d` oculta los respaldos estáticos (`.solo-sin-escena`).
 */
export function EscenaFondo() {
  const ref = useRef<HTMLDivElement>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    const contenedor = ref.current;
    if (!contenedor) return;
    const movimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const nucleos = navigator.hardwareConcurrency || undefined;
    if (!puedeAnimar({ reducirMovimiento: movimiento.matches, webgl: hayWebgl(), ahorroDatos: Boolean(conexion?.saveData), nucleos })) return;

    let destruir: (() => void) | undefined;
    let cancelado = false;
    const raiz = document.documentElement;
    const apagar = () => {
      destruir?.();
      destruir = undefined;
      raiz.classList.remove("escena-3d");
      setLista(false);
    };

    const arrancar = async () => {
      const { crearEscena } = await import("./motor");
      if (cancelado) return;
      destruir = crearEscena(contenedor, {
        particulas: cantidadParticulas(window.innerWidth, nucleos),
        alEstarLista: () => {
          raiz.classList.add("escena-3d");
          setLista(true);
        },
        alFallar: apagar,
      });
    };

    // Espera a que el navegador esté libre: primero el texto, después las partículas.
    const ric = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 600));
    const cic = window.cancelIdleCallback ?? window.clearTimeout;
    const espera = ric(() => void arrancar(), { timeout: 2000 });

    const alCambiarMovimiento = () => {
      if (movimiento.matches) apagar();
    };
    movimiento.addEventListener("change", alCambiarMovimiento);

    return () => {
      cancelado = true;
      cic(espera);
      movimiento.removeEventListener("change", alCambiarMovimiento);
      apagar();
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-[1600ms] ease-out ${lista ? "opacity-100" : "opacity-0"}`}
    />
  );
}
