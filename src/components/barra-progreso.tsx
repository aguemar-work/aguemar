"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/** Enlaces que no navegan dentro de la app: PDF (se abren o descargan) y la API. */
const SIN_NAVEGACION = /\/pdf(?:\?|$)|^\/api\//;

/**
 * Línea de progreso fija arriba mientras se navega entre páginas del panel o del workspace.
 *
 * Sustituye a los `loading.tsx` de página: la página anterior sigue visible hasta que llega
 * la nueva, en vez de borrarse con un esqueleto en cada clic. Arranca al hacer clic en un
 * enlace interno (cualquier `<a>`, sin tocar los enlaces) y termina cuando cambian la ruta o
 * los parámetros. Aparece con 120 ms de retraso para no parpadear cuando la página ya está
 * en el caché del router, y se apaga sola a los 8 s por si el clic no terminó en navegación.
 */
export function BarraProgreso() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const clave = `${pathname}?${searchParams}`;
  const [pendiente, setPendiente] = useState(false);

  // Al cambiar la ruta, la navegación terminó: estado derivado ajustado durante el render.
  const [claveVista, setClaveVista] = useState(clave);
  if (claveVista !== clave) {
    setClaveVista(clave);
    setPendiente(false);
  }

  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const enlace = (e.target as Element | null)?.closest?.("a[href]");
      if (!(enlace instanceof HTMLAnchorElement)) return;
      if ((enlace.target && enlace.target !== "_self") || enlace.hasAttribute("download")) return;
      const destino = new URL(enlace.href, location.href);
      if (destino.origin !== location.origin) return;
      if (destino.pathname === location.pathname && destino.search === location.search) return;
      if (SIN_NAVEGACION.test(destino.pathname)) return;
      setPendiente(true);
    }
    document.addEventListener("click", alHacerClic);
    return () => document.removeEventListener("click", alHacerClic);
  }, []);

  useEffect(() => {
    if (!pendiente) return;
    const t = window.setTimeout(() => setPendiente(false), 8000);
    return () => window.clearTimeout(t);
  }, [pendiente]);

  return <div aria-hidden={!pendiente} role={pendiente ? "progressbar" : undefined} aria-label="Cargando la página" className={cn("barra-progreso", pendiente && "activa")} />;
}
