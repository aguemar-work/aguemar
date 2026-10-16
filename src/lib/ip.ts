/**
 * IP del visitante según el proxy. Vercel pone la IP real primero en
 * `x-forwarded-for`; `x-real-ip` es el respaldo. Si no parece una IP, null:
 * las funciones de la base tratan null como "sin IP" (y aplican sus topes globales).
 */
export function ipDe(h: Headers): string | null {
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();
  return /^[\d.:a-fA-F]{3,45}$/.test(ip) ? ip : null;
}
