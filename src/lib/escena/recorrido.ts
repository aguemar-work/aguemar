import type { Forma } from "./formas";

/**
 * Cómo se mueve la escena con el scroll: cada sección marcada con `data-forma`
 * es un ancla; entre dos anclas, las partículas pasan de una forma a la otra.
 * Funciones puras para probarlas sin navegador.
 */

export interface Ancla {
  /** Centro vertical de la sección, en coordenadas del documento (px). */
  centro: number;
  forma: Forma;
  /** Dónde se dibuja la forma: -1 borde izquierdo, 0 centro, 1 borde derecho (fracción del medio ancho visible). */
  lado: number;
  /** Brillo de 0 a 1: más bajo donde hay texto encima. */
  intensidad: number;
  escala: number;
}

export interface EstadoRecorrido {
  desde: Forma;
  hacia: Forma;
  /** 0 = forma `desde`, 1 = forma `hacia`. */
  mezcla: number;
  lado: number;
  intensidad: number;
  escala: number;
}

function suavizar(borde0: number, borde1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - borde0) / (borde1 - borde0)));
  return t * t * (3 - 2 * t);
}

/**
 * Estado de la escena para una posición de scroll: `y` es el centro de la ventana en el documento.
 * La forma se queda quieta cerca del centro de su sección y cambia en el tramo intermedio.
 */
export function estadoRecorrido(anclas: Ancla[], y: number): EstadoRecorrido | null {
  if (!anclas.length) return null;
  const quieto = (a: Ancla): EstadoRecorrido => ({ desde: a.forma, hacia: a.forma, mezcla: 0, lado: a.lado, intensidad: a.intensidad, escala: a.escala });
  const primera = anclas[0]!;
  const ultima = anclas[anclas.length - 1]!;
  if (y <= primera.centro) return quieto(primera);
  if (y >= ultima.centro) return quieto(ultima);

  let i = 0;
  while (i < anclas.length - 2 && y > anclas[i + 1]!.centro) i++;
  const a = anclas[i]!;
  const b = anclas[i + 1]!;
  const tramo = b.centro - a.centro;
  const t = tramo > 0 ? suavizar(0.3, 0.7, (y - a.centro) / tramo) : 1;
  const mezclar = (x: number, z: number) => x + (z - x) * t;
  return {
    desde: a.forma,
    hacia: b.forma,
    mezcla: t,
    lado: mezclar(a.lado, b.lado),
    intensidad: mezclar(a.intensidad, b.intensidad),
    escala: mezclar(a.escala, b.escala),
  };
}

/** ¿Se puede mostrar la escena? Si no, la landing queda con los corchetes en SVG. */
export function puedeAnimar(opciones: { reducirMovimiento: boolean; webgl: boolean; ahorroDatos: boolean; nucleos?: number }): boolean {
  if (opciones.reducirMovimiento || !opciones.webgl || opciones.ahorroDatos) return false;
  return opciones.nucleos === undefined || opciones.nucleos >= 4;
}

/** Partículas según la pantalla: menos en celulares para cuidar la batería. */
export function cantidadParticulas(anchoVentana: number, nucleos?: number): number {
  if (anchoVentana < 768) return 2200;
  return (nucleos ?? 8) >= 8 ? 7000 : 4500;
}
