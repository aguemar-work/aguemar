/**
 * Landing: tipos de landing_datos() y utilidades puras (agrupar servicios, precios, WhatsApp).
 */
import type { Area } from "@/types/database";
import { formatearMonto } from "@/lib/format";

export interface ServicioLanding {
  id: string;
  nombre: string;
  descripcion: string | null;
  area: Area;
  precio_base: number | null;
  unidad: string;
}

export interface MarcaLanding {
  nombre_comercial: string;
  responsable: string;
  cargo: string;
  ruc: string | null;
  telefono: string | null;
  correo: string | null;
  web: string | null;
  direccion: string | null;
}

export interface DatosLanding {
  marca: MarcaLanding | null;
  servicios: ServicioLanding[];
}

export function serviciosPorArea(servicios: ServicioLanding[]): Record<Area, ServicioLanding[]> {
  const grupos: Record<Area, ServicioLanding[]> = { diseno: [], desarrollo: [], soporte: [] };
  for (const s of servicios) grupos[s.area]?.push(s);
  return grupos;
}

/** "Desde S/ 80,00 por equipo" o null si no hay precio base. */
export function textoPrecio(s: Pick<ServicioLanding, "precio_base" | "unidad">, etiquetas = { desde: "Desde", por: "por" }): string | null {
  if (s.precio_base == null || s.precio_base <= 0) return null;
  return `${etiquetas.desde} ${formatearMonto(s.precio_base)} ${etiquetas.por} ${s.unidad}`;
}

/** Número para wa.me: 9 dígitos peruanos → 51XXXXXXXXX; otros, solo dígitos. Null si no sirve. */
export function numeroWhatsApp(telefono: string | null | undefined): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) return `51${d}`;
  if (d.length === 11 && d.startsWith("519")) return d;
  return d.length >= 10 ? d : null;
}

export function enlaceWhatsApp(telefono: string | null | undefined, texto: string): string | null {
  const n = numeroWhatsApp(telefono);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

/** El mismo enlace de wa.me con otro texto ya escrito. */
export function conTextoWhatsApp(enlace: string, texto: string): string {
  return `${enlace.split("?")[0]}?text=${encodeURIComponent(texto)}`;
}

/** "924 262 338" o "+51 924 262 338" para mostrar. */
export function telefonoLegible(telefono: string | null | undefined): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (!d) return null;
  const grupos = (n: string) => `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
  if (d.length === 9) return grupos(d);
  if (d.length === 11 && d.startsWith("51")) return `+51 ${grupos(d.slice(2))}`;
  return telefono!.trim();
}
