/**
 * Cálculos de cotizaciones (puros, testeables). Son el espejo de los triggers
 * de la base (cotizacion_item_importe y cotizacion_totales): la base es la que
 * manda; aquí sirven para la vista previa mientras se escribe.
 */
import type { EstadoCotizacion, IgvModo } from "@/types/database";
import { diasHasta } from "@/lib/trabajos-util";

/** Redondeo a entero, mitad hacia arriba (igual que round() de Postgres para positivos). */
function redondear(n: number): number {
  return Math.round(n + Number.EPSILON * Math.sign(n));
}

/**
 * Importe de una línea en céntimos: cantidad × precio − descuento, nunca negativo.
 *
 * La base multiplica con decimales exactos (`numeric(12,3)`) y redondea la mitad hacia arriba. En coma
 * flotante `1,005 × 100` da 100,49999… y salía 100 en la vista previa mientras la base guardaba 101. Por eso
 * la cantidad pasa a milésimas (la base admite tres decimales) y el producto se hace en enteros exactos.
 */
export function importeLinea(cantidad: number, precioUnitario: number, descuento = 0): number {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 0;
  const milesimas = BigInt(Math.round(cantidad * 1000));
  const bruto = Number((milesimas * BigInt(Math.round(precioUnitario)) + BigInt(500)) / BigInt(1000));
  return Math.max(bruto - descuento, 0);
}

export interface Totales {
  subtotal: number;
  igv: number;
  total: number;
}

/**
 * Totales desde la suma de importes. igvPct en centésimas de punto (1800 = 18 %).
 * - "sumar": el IGV se agrega encima del subtotal.
 * - "incluido": los precios ya traen IGV; se desglosa.
 */
export function calcularTotales(importes: number[], igvPct: number, modo: IgvModo): Totales {
  const suma = importes.reduce((s, i) => s + i, 0);
  if (modo === "sumar") {
    const igv = redondear((suma * igvPct) / 10000);
    return { subtotal: suma, igv, total: suma + igv };
  }
  const subtotal = redondear((suma * 10000) / (10000 + igvPct));
  return { subtotal, igv: suma - subtotal, total: suma };
}

/** "2,5" o "2.5" → 2.5; vacío o inválido → NaN. Hasta 3 decimales como en la base. */
export function aCantidad(texto: string | number): number {
  const limpio = String(texto).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(limpio)) return Number.NaN;
  return Number(limpio);
}

/** Fecha en que vence la validez ("AAAA-MM-DD"). */
export function fechaVence(fecha: string, validezDias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + validezDias)).toISOString().slice(0, 10);
}

/** Una cotización enviada cuya validez ya pasó se muestra como vencida aunque la base no la haya marcado. */
export function estadoEfectivo(c: { estado: EstadoCotizacion; fecha: string; validez_dias: number }, hoy: string): EstadoCotizacion {
  if (c.estado !== "enviada") return c.estado;
  const dias = diasHasta(fechaVence(c.fecha, c.validez_dias), hoy);
  return dias !== null && dias < 0 ? "vencida" : "enviada";
}

/** Saldo pendiente: lo aceptado menos lo cobrado, nunca negativo. */
export function saldo(total: number, cobrado: number): number {
  return Math.max(total - cobrado, 0);
}

/** Nombre del PDF: COT-2026-001_SGC.pdf o FT-2026-001_SGC.pdf (sin caracteres raros). */
export function nombreArchivo(numero: string | null, empresa: string): string {
  const limpio = empresa
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${numero ?? "COT-borrador"}_${limpio || "Empresa"}.pdf`;
}

export const ESTADOS_COTIZACION: { valor: EstadoCotizacion; etiqueta: string; variant: "outline" | "warn" | "ok" | "danger" | "default" }[] = [
  { valor: "borrador", etiqueta: "Borrador", variant: "outline" },
  { valor: "enviada", etiqueta: "Enviada", variant: "warn" },
  { valor: "aceptada", etiqueta: "Aceptada", variant: "ok" },
  { valor: "rechazada", etiqueta: "Rechazada", variant: "danger" },
  { valor: "vencida", etiqueta: "Vencida", variant: "default" },
];

export const MEDIOS_PAGO = [
  { valor: "transferencia", etiqueta: "Transferencia" },
  { valor: "yape", etiqueta: "Yape" },
  { valor: "plin", etiqueta: "Plin" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta", etiqueta: "Tarjeta" },
  { valor: "otro", etiqueta: "Otro" },
] as const;

export type MedioPago = (typeof MEDIOS_PAGO)[number]["valor"];

/** Deuda de una cotización aceptada, como la calcula deudas_cotizacion() en la base. */
export interface DeudaCotizacion {
  cotizacion_id: string;
  cliente_id: string;
  moneda: "PEN" | "USD";
  total: number;
  pendiente: number;
  aceptada_el: string;
  plazo_pago_dias: number;
  vence_pago: string;
  dias_atraso: number;
  recordar_pago: boolean;
}

/** Texto y tono del pago de una cotización aceptada: pagada, por vencer o vencida. */
export function estadoPago(d: { pendiente: number; vence_pago: string }, hoy: string): { texto: string; tono: "ok" | "warn" | "danger" } {
  if (d.pendiente <= 0) return { texto: "Pagada", tono: "ok" };
  const dias = diasHasta(d.vence_pago, hoy) ?? 0;
  const n = (x: number) => `${x} ${x === 1 ? "día" : "días"}`;
  if (dias < 0) return { texto: `Vencida hace ${n(-dias)}`, tono: "danger" };
  if (dias === 0) return { texto: "Vence hoy", tono: "warn" };
  return { texto: `Vence en ${n(dias)}`, tono: dias <= 3 ? "warn" : "ok" };
}

/** Cómo se llama cada recordatorio en el historial. */
export const ETIQUETA_RECORDATORIO: Record<"previo" | "atraso_1" | "atraso_7", string> = {
  previo: "Antes de vencer",
  atraso_1: "Al vencer",
  atraso_7: "7 días de atraso",
};

/** Datos del mensaje de WhatsApp de una cotización (ya formateados para mostrar). */
export interface DatosMensajeCotizacion {
  numero: string | null;
  asunto: string;
  total: string;
  vence: string;
  contacto: string | null;
  /** Enlace completo y por dónde lleva: el espacio de la empresa o el portal público. */
  enlace: { url: string; via: "workspace" | "portal" } | null;
  /** Si ya está aceptada: la fecha (dd/mm/aaaa). Cambia el mensaje a la confirmación final. */
  aceptadaEl: string | null;
}

/**
 * Texto para WhatsApp. La cotización siempre se manda y se confirma por WhatsApp (respuesta del
 * 21/10): al enviarla invita a revisarla y aceptarla; ya aceptada, confirma lo aceptado y acompaña
 * el PDF congelado.
 */
export function mensajeWhatsAppCotizacion(d: DatosMensajeCotizacion): string {
  const saludo = d.contacto ? `Hola ${d.contacto.split(" ")[0]}` : "Hola";
  const cot = d.numero ? `la cotización ${d.numero} (${d.asunto}) por ${d.total}` : `la cotización (${d.asunto}) por ${d.total}`;
  if (d.aceptadaEl) {
    const ver = d.enlace ? ` También la puedes ver aquí: ${d.enlace.url}` : "";
    return `${saludo}, te confirmo ${cot}, aceptada el ${d.aceptadaEl}. Te adjunto el PDF de lo aceptado.${ver}`;
  }
  if (d.enlace?.via === "workspace") {
    return `${saludo}, te envío ${cot}, válida hasta el ${d.vence}. Puedes revisarla, descargar el PDF y aceptarla en tu espacio: ${d.enlace.url}`;
  }
  if (d.enlace) {
    return `${saludo}, te envío ${cot}, válida hasta el ${d.vence}. Aquí puedes verla, descargar el PDF y aceptarla: ${d.enlace.url}`;
  }
  return `${saludo}, te envío ${cot}, válida hasta el ${d.vence}. Te adjunto el PDF; cualquier duda me escribes.`;
}
