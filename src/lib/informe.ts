/**
 * Informes de avance: periodos, textos y el armado automático a partir de lo hecho en el periodo
 * (panel_informe_periodo). Funciones puras, sin red.
 */
import { formatearFecha } from "@/lib/format";
import { infoTipo } from "@/lib/calendario";
import { infoEstado } from "@/lib/areas";
import type { EstadoTrabajo } from "@/types/database";

export interface IndicadorInforme {
  valor: string;
  etiqueta: string;
  nota?: string | null;
}

export interface SeccionInforme {
  titulo: string;
  texto: string;
}

/** Lo que devuelve panel_informe_periodo. */
export interface DatosPeriodo {
  tareas_hechas: number;
  actividades_hechas: number;
  entregados: number;
  fichas_total: number;
  trabajos: { titulo: string; estado: EstadoTrabajo; hechas: number; total: number; tareas: string[] }[];
  actividades: { fecha: string; titulo: string; tipo: string }[];
  fichas: { numero: string | null; titular: string; fecha: string }[];
  proximas: { fecha: string; titulo: string; tipo: string }[];
}

export const MAX_INDICADORES = 4;
export const MAX_SECCIONES = 20;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Primer y último día del mes de `fecha` ("AAAA-MM-DD"), desplazado `delta` meses. */
export function periodoMes(fecha: string, delta = 0): { inicio: string; fin: string } {
  const [a, m] = fecha.split("-").map(Number);
  return { inicio: iso(new Date(Date.UTC(a, m - 1 + delta, 1))), fin: iso(new Date(Date.UTC(a, m + delta, 0))) };
}

/** ¿El periodo es un mes calendario completo? */
export function esMesCompleto(inicio: string, fin: string): boolean {
  const p = periodoMes(inicio);
  return p.inicio === inicio && p.fin === fin;
}

/** "Octubre 2026", "Septiembre – octubre 2026" o "01/10/2026 – 15/10/2026". */
export function textoPeriodo(inicio: string, fin: string): string {
  const [ai, mi] = inicio.split("-").map(Number);
  const [af, mf] = fin.split("-").map(Number);
  const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  if (esMesCompleto(inicio, fin)) return `${mayus(MESES[mi - 1])} ${ai}`;
  const varios = periodoMes(inicio).inicio === inicio && periodoMes(fin).fin === fin;
  if (varios) {
    return ai === af ? `${mayus(MESES[mi - 1])} – ${MESES[mf - 1]} ${af}` : `${mayus(MESES[mi - 1])} ${ai} – ${MESES[mf - 1]} ${af}`;
  }
  return `${formatearFecha(inicio)} – ${formatearFecha(fin)}`;
}

/** Título sugerido: "Informe de avance · Octubre 2026". */
export function tituloSugerido(inicio: string, fin: string): string {
  return `Informe de avance · ${textoPeriodo(inicio, fin)}`;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/**
 * Arma indicadores, secciones y un resumen a partir de lo hecho en el periodo.
 * Solo propone: el propietario revisa y edita antes de publicar.
 */
export function armarDesdePeriodo(d: DatosPeriodo): { resumen: string; indicadores: IndicadorInforme[]; secciones: SeccionInforme[] } {
  const candidatos: (IndicadorInforme & { n: number })[] = [
    { n: d.tareas_hechas, valor: String(d.tareas_hechas), etiqueta: d.tareas_hechas === 1 ? "Tarea completada" : "Tareas completadas" },
    { n: d.entregados, valor: String(d.entregados), etiqueta: d.entregados === 1 ? "Trabajo entregado" : "Trabajos entregados" },
    { n: d.actividades_hechas, valor: String(d.actividades_hechas), etiqueta: d.actividades_hechas === 1 ? "Actividad realizada" : "Actividades realizadas" },
    { n: d.fichas_total, valor: String(d.fichas_total), etiqueta: d.fichas_total === 1 ? "Servicio técnico" : "Servicios técnicos" },
  ];
  const indicadores = candidatos.filter((c) => c.n > 0).map(({ valor, etiqueta }) => ({ valor, etiqueta }));
  // Avance de un solo trabajo: el indicador más claro para la empresa.
  if (d.trabajos.length === 1 && d.trabajos[0].total > 0 && indicadores.length < MAX_INDICADORES) {
    const t = d.trabajos[0];
    indicadores.unshift({ valor: `${Math.round((t.hechas / t.total) * 100)} %`, etiqueta: "Avance del proyecto" });
  }

  const secciones: SeccionInforme[] = [];
  if (d.trabajos.length) {
    secciones.push({
      titulo: "Trabajo realizado",
      texto: d.trabajos
        .map((t) => {
          const cabecera = `${t.titulo} — ${infoEstado(t.estado).etiqueta.toLowerCase()}${t.total ? ` (${t.hechas}/${t.total} tareas)` : ""}`;
          return [cabecera, ...t.tareas.map((x) => `- ${x}`)].join("\n");
        })
        .join("\n\n"),
    });
  }
  if (d.actividades.length) {
    secciones.push({
      titulo: "Actividades",
      texto: d.actividades.map((a) => `- ${formatearFecha(a.fecha)} · ${infoTipo(a.tipo).etiqueta}: ${a.titulo}`).join("\n"),
    });
  }
  if (d.fichas.length) {
    secciones.push({
      titulo: "Soporte técnico",
      texto: d.fichas.map((f) => `- ${formatearFecha(f.fecha)} · ${f.numero ?? "Ficha"}: ${f.titular}`).join("\n"),
    });
  }
  secciones.push({
    titulo: "Próximos pasos",
    texto: d.proximas.length ? d.proximas.map((a) => `- ${formatearFecha(a.fecha)} · ${a.titulo}`).join("\n") : "",
  });

  const partes = [
    d.tareas_hechas ? plural(d.tareas_hechas, "tarea completada", "tareas completadas") : null,
    d.entregados ? plural(d.entregados, "trabajo entregado", "trabajos entregados") : null,
    d.actividades_hechas ? plural(d.actividades_hechas, "actividad realizada", "actividades realizadas") : null,
    d.fichas_total ? plural(d.fichas_total, "servicio técnico", "servicios técnicos") : null,
  ].filter(Boolean) as string[];
  const resumen = partes.length
    ? `En este periodo: ${partes.length > 1 ? `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}` : partes[0]}.`
    : "";

  return { resumen, indicadores: indicadores.slice(0, MAX_INDICADORES), secciones };
}

export type Bloque = { tipo: "parrafo"; texto: string } | { tipo: "lista"; items: string[] };

/**
 * Texto de una sección → bloques: las líneas que empiezan con "-", "•" o "*" forman listas;
 * las demás, párrafos (una línea en blanco separa párrafos).
 */
export function bloques(texto: string): Bloque[] {
  const salida: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrarParrafo = () => {
    if (parrafo.length) salida.push({ tipo: "parrafo", texto: parrafo.join("\n") });
    parrafo = [];
  };
  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    const item = /^[-•*]\s+(.*)$/.exec(linea);
    if (item) {
      cerrarParrafo();
      const ultimo = salida[salida.length - 1];
      if (ultimo?.tipo === "lista") ultimo.items.push(item[1]);
      else salida.push({ tipo: "lista", items: [item[1]] });
    } else if (!linea) {
      cerrarParrafo();
    } else {
      parrafo.push(linea);
    }
  }
  cerrarParrafo();
  return salida;
}
