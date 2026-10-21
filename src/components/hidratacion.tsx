"use client";

import { useEffect } from "react";

/**
 * Marca el documento cuando React ya hidrató (`<html data-hidratado="1">`). Las pruebas de navegador
 * esperan esa marca antes de hacer clic: sin ella, un clic en un enlace o un select que llega antes de
 * la hidratación hace una navegación completa (o se pierde) y la prueba falla a veces. No cambia nada
 * visible ni hace peticiones.
 */
export function Hidratacion() {
  useEffect(() => {
    document.documentElement.dataset.hidratado = "1";
  }, []);
  return null;
}
