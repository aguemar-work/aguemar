"use client";

import { useEffect } from "react";
import { usePanelLateral } from "@/components/panel/panel-lateral";

/**
 * Avisa al cerrar o recargar la pestaña si el formulario tiene cambios sin guardar.
 * Dentro de un panel lateral, además pregunta antes de cerrarlo.
 */
export function useAvisoCambios(hayCambios: boolean) {
  const panel = usePanelLateral();

  useEffect(() => {
    panel?.marcarCambios(hayCambios);
    // Al desmontarse (p. ej. tras guardar y pasar al detalle en el mismo panel), ya no hay cambios pendientes.
    return () => panel?.marcarCambios(false);
  }, [panel, hayCambios]);

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
