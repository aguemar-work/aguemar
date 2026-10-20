/**
 * De dónde llega quien visita la landing (HU 1.3): se clasifica en una lista cerrada a partir del
 * dominio que lo trajo (solo el dominio, nunca la URL completa) y de las UTM del enlace.
 * La misma lista valida la base (leads.origen, eventos_landing.origen).
 */
export const ORIGENES = ["google", "bing", "instagram", "facebook", "linkedin", "tiktok", "youtube", "x", "whatsapp", "correo", "campana", "otro", "directo"] as const;
export type Origen = (typeof ORIGENES)[number];

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  google: "Google",
  bing: "Bing",
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  whatsapp: "WhatsApp",
  correo: "Correo",
  campana: "Campaña",
  otro: "Otro sitio",
  directo: "Directo",
};

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface DatosOrigen {
  /** Dominio que trajo a la persona, sin "www.". */
  referente?: string | null;
  utm?: Utm | null;
}

/** Reglas por palabra clave: valen para el dominio y para utm_source. */
const REGLAS: [RegExp, Origen][] = [
  [/(^|\.)(mail\.google|outlook\.|mail\.)|^(email|e-mail|correo|newsletter|mail)$/, "correo"],
  [/(^|\.)google\.|^google$/, "google"],
  [/(^|\.)bing\.com$|^bing$/, "bing"],
  [/(^|\.)instagram\.com$|^(ig|instagram)$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.me|fb\.com)$|^(fb|facebook)$/, "facebook"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$|^linkedin$/, "linkedin"],
  [/(^|\.)tiktok\.com$|^tiktok$/, "tiktok"],
  [/(^|\.)(youtube\.com|youtu\.be)$|^(youtube|yt)$/, "youtube"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$|^(x|twitter)$/, "x"],
  [/(^|\.)(whatsapp\.com|wa\.me)$|^(whatsapp|wa)$/, "whatsapp"],
];

const porReglas = (texto: string): Origen | null => {
  const t = texto.trim().toLowerCase();
  return REGLAS.find(([re]) => re.test(t))?.[1] ?? null;
};

/** Primero manda utm_source (lo pusiste tú en el enlace); luego el dominio que lo trajo. */
export function clasificarOrigen(d: DatosOrigen | null | undefined): Origen {
  const fuente = d?.utm?.source?.trim();
  if (fuente) return porReglas(fuente) ?? "campana";
  if (d?.utm?.medium || d?.utm?.campaign) return "campana";
  const ref = d?.referente?.trim();
  if (ref) return porReglas(ref) ?? "otro";
  return "directo";
}

/** Dominio sin "www." de una URL; null si no es http(s) o si es el propio sitio. */
export function dominioReferente(url: string, propio?: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (propio && host === propio.toLowerCase().replace(/^www\./, "")) return null;
    return host.slice(0, 100) || null;
  } catch {
    return null;
  }
}

/** UTM de un query string, recortadas; null si no hay ninguna. */
export function utmDe(search: string): Utm | null {
  const p = new URLSearchParams(search);
  const utm: Utm = {};
  for (const k of ["source", "medium", "campaign"] as const) {
    const v = p.get(`utm_${k}`)?.trim().slice(0, 80);
    if (v) utm[k] = v;
  }
  return Object.keys(utm).length ? utm : null;
}

/** Texto corto para el panel: "Google · cpc · otoño" o "Otro sitio · ejemplo.com". */
export function describirOrigen(origen: string | null, referente: string | null, utm: Utm | null): string | null {
  if (!origen) return null;
  const etiqueta = ETIQUETA_ORIGEN[origen as Origen] ?? origen;
  const extra = [utm?.medium, utm?.campaign].filter(Boolean);
  if (!extra.length && referente && (origen === "otro" || origen === "correo")) extra.push(referente);
  if (origen === "campana" && utm?.source) extra.unshift(utm.source);
  return [etiqueta, ...extra].join(" · ");
}
