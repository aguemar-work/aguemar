"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ContextoPanel {
  /** Cierra el panel y vuelve a la página de fondo. Con `forzar`, no pregunta por cambios sin guardar. */
  cerrar: (forzar?: boolean) => void;
  /** Los formularios avisan si tienen cambios sin guardar, para preguntar antes de cerrar. */
  marcarCambios: (hay: boolean) => void;
}

const Contexto = createContext<ContextoPanel | null>(null);

/** null cuando el componente no está dentro de un panel lateral (página completa). */
export function usePanelLateral() {
  return useContext(Contexto);
}

interface Props {
  /** Título accesible del panel; el contenido muestra su propio encabezado. */
  etiqueta: string;
  ancho?: "md" | "xl";
  children: ReactNode;
}

/**
 * Panel lateral para rutas interceptadas (@modal): crear, editar o ver algo sin
 * salir de la lista. La URL cambia, así que recargar o compartir el enlace abre
 * la página completa. Cerrar = volver atrás en el historial.
 */
export function PanelLateral({ etiqueta, ancho = "md", children }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(true);
  const cambios = useRef(false);

  const cerrar = useCallback(
    (forzar = false) => {
      if (!forzar && cambios.current && !window.confirm("Tienes cambios sin guardar. ¿Cerrar de todos modos?")) return;
      cambios.current = false;
      setAbierto(false);
      // Deja terminar la animación de salida antes de volver.
      window.setTimeout(() => router.back(), 160);
    },
    [router],
  );

  const valor = useMemo<ContextoPanel>(() => ({ cerrar, marcarCambios: (hay) => (cambios.current = hay) }), [cerrar]);

  return (
    <Contexto.Provider value={valor}>
      <Sheet open={abierto} onOpenChange={(o) => (o ? null : cerrar())}>
        <SheetContent
          side="right"
          aria-describedby={undefined}
          className={cn("w-full scroll-pb-24 overflow-y-auto p-0 data-[state=open]:duration-300", ancho === "xl" ? "sm:max-w-5xl" : "sm:max-w-2xl")}
        >
          <SheetTitle className="sr-only">{etiqueta}</SheetTitle>
          <div className="px-4 pb-6 pt-12 sm:px-8">{children}</div>
        </SheetContent>
      </Sheet>
    </Contexto.Provider>
  );
}
