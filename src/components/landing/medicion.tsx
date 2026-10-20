"use client";

import { useEffect } from "react";
import { clasificarOrigen, dominioReferente, utmDe, type DatosOrigen } from "@/lib/origen";

const CLAVE = "aguemar:origen";
const EVENTOS = new Set(["whatsapp_click", "correo_click"]);

/** Origen guardado al entrar a la landing en esta pestaña (null si no se pudo leer). */
export function leerOrigen(): DatosOrigen | null {
  try {
    const guardado = sessionStorage.getItem(CLAVE);
    return guardado ? (JSON.parse(guardado) as DatosOrigen) : null;
  } catch {
    return null;
  }
}

/**
 * Medición sin cookies ni IP (HU 1.1 y 1.3):
 * - Al entrar guarda en sessionStorage (se borra al cerrar la pestaña) el dominio que trajo a la
 *   persona y las UTM del enlace; el formulario lo manda con el mensaje.
 * - Cuenta los clics en los enlaces con `data-evento` (WhatsApp y correo) en /api/evento.
 */
export function Medicion() {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(CLAVE)) {
        const datos: DatosOrigen = {
          referente: document.referrer ? dominioReferente(document.referrer, location.hostname) : null,
          utm: utmDe(location.search),
        };
        sessionStorage.setItem(CLAVE, JSON.stringify(datos));
      }
    } catch {
      // Sin sessionStorage (modo privado estricto): el lead llega como "directo".
    }

    const alClic = (e: MouseEvent) => {
      const enlace = (e.target as Element | null)?.closest?.("a[data-evento]");
      const evento = enlace?.getAttribute("data-evento");
      if (!evento || !EVENTOS.has(evento)) return;
      const cuerpo = JSON.stringify({ evento, origen: clasificarOrigen(leerOrigen()) });
      try {
        if (!navigator.sendBeacon?.("/api/evento", new Blob([cuerpo], { type: "application/json" }))) {
          void fetch("/api/evento", { method: "POST", body: cuerpo, keepalive: true, headers: { "content-type": "application/json" } });
        }
      } catch {
        // Medir nunca estorba al clic.
      }
    };
    document.addEventListener("click", alClic);
    return () => document.removeEventListener("click", alClic);
  }, []);

  return null;
}
