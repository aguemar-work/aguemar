/**
 * Formato de fechas y montos para Perú.
 * - Fechas: dd/mm/aaaa en zona America/Lima.
 * - Montos: se reciben en céntimos enteros y se muestran con es-PE (S/ 1 234,50).
 */

export const ZONA_HORARIA = "America/Lima";
export type Moneda = "PEN" | "USD";

const SIMBOLO: Record<Moneda, string> = { PEN: "S/", USD: "US$" };

/**
 * Convierte céntimos enteros a texto con miles separados por espacio y coma decimal
 * (1 234,50). Se hace a mano para no depender de los datos ICU de cada entorno.
 */
export function formatearCentimos(centimos: number): string {
  if (!Number.isInteger(centimos)) {
    throw new Error("Los montos deben ser enteros en céntimos");
  }
  const absoluto = Math.abs(centimos);
  const entero = Math.floor(absoluto / 100).toString();
  const decimales = (absoluto % 100).toString().padStart(2, "0");
  const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${centimos < 0 ? "-" : ""}${miles},${decimales}`;
}

/** Monto con símbolo: S/ 1 234,50 o US$ 1 234,50. */
export function formatearMonto(centimos: number, moneda: Moneda = "PEN"): string {
  return `${SIMBOLO[moneda]} ${formatearCentimos(centimos)}`;
}

export function simboloMoneda(moneda: Moneda): string {
  return SIMBOLO[moneda];
}

/** Devuelve las partes de una fecha en zona Lima. */
function partesLima(fecha: Date) {
  const partes = new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(fecha);
  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "";
  return {
    dia: obtener("day"),
    mes: obtener("month"),
    anio: obtener("year"),
    hora: obtener("hour").padStart(2, "0"),
    minuto: obtener("minute"),
  };
}

/** Acepta Date, ISO o "AAAA-MM-DD" (fecha civil sin hora). */
function aFecha(valor: Date | string): Date {
  if (valor instanceof Date) return valor;
  // "AAAA-MM-DD": la tratamos como fecha civil en Lima (mediodía evita saltos de día).
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date(`${valor}T12:00:00-05:00`);
  }
  return new Date(valor);
}

/** dd/mm/aaaa */
export function formatearFecha(valor: Date | string): string {
  const { dia, mes, anio } = partesLima(aFecha(valor));
  return `${dia}/${mes}/${anio}`;
}

/** dd/mm/aaaa HH:mm */
export function formatearFechaHora(valor: Date | string): string {
  const { dia, mes, anio, hora, minuto } = partesLima(aFecha(valor));
  return `${dia}/${mes}/${anio} ${hora}:${minuto}`;
}

/** "AAAA-MM-DD" de hoy en Lima, útil para inputs type=date y para la numeración anual. */
export function hoyLima(): string {
  const { dia, mes, anio } = partesLima(new Date());
  return `${anio}-${mes}-${dia}`;
}

export function anioLima(fecha: Date = new Date()): number {
  return Number(partesLima(fecha).anio);
}

/** Suma días a una fecha civil "AAAA-MM-DD" y devuelve "AAAA-MM-DD". */
export function sumarDias(fechaIso: string, dias: number): string {
  const [a, m, d] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d + dias));
  return fecha.toISOString().slice(0, 10);
}

/** Convierte un texto con decimales (coma o punto) a céntimos enteros, sin usar float para el redondeo. */
export function aCentimos(texto: string | number): number {
  const limpio = String(texto).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) {
    throw new Error(`Monto inválido: ${texto}`);
  }
  const negativo = limpio.startsWith("-");
  const [entero, decimal = ""] = limpio.replace("-", "").split(".");
  const dec2 = (decimal + "00").slice(0, 2);
  // Redondeo al tercer decimal (mitad hacia arriba)
  const resto = decimal.length > 2 ? Number(decimal[2]) : 0;
  let centimos = Number(entero) * 100 + Number(dec2);
  if (resto >= 5) centimos += 1;
  return negativo ? -centimos : centimos;
}
