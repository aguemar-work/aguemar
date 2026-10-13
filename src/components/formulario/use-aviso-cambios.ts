"use client";

import { useEffect } from "react";

/** Avisa al cerrar o recargar la pestaña si el formulario tiene cambios sin guardar. */
export function useAvisoCambios(hayCambios: boolean) {
  useEffect(() => {
    if (!hayCambios) return;
    const manejador = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Los navegadores modernos ignoran el texto, pero requieren returnValue.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", manejador);
    return () => window.removeEventListener("beforeunload", manejador);
  }, [hayCambios]);
}
