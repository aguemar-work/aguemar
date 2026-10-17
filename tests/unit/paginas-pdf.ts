import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Cuenta las páginas de un PDF generado por react-pdf (el árbol de páginas va sin comprimir). */
export function paginasPdf(pdf: Uint8Array): number {
  const m = /\/Type \/Pages[\s\S]*?\/Count (\d+)/.exec(Buffer.from(pdf).toString("latin1"));
  return m ? Number(m[1]) : NaN;
}

/** Con GUARDAR_PDF=<carpeta> guarda el PDF ahí para revisarlo a ojo. */
export function guardarPdf(nombre: string, pdf: Uint8Array) {
  const carpeta = process.env.GUARDAR_PDF;
  if (!carpeta) return;
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(path.join(carpeta, nombre), pdf);
}
