/** Lee los claims del access token sin ir a la red; null si no se puede. */
export function claimsDelToken(token: string | undefined): { sub: string; email?: string; exp?: number } | null {
  if (!token) return null;
  try {
    const parte = token.split(".")[1];
    if (!parte) return null;
    const json = Buffer.from(parte.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const claims = JSON.parse(json) as { sub?: unknown; email?: unknown; exp?: unknown };
    if (typeof claims.sub !== "string" || !claims.sub) return null;
    return {
      sub: claims.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      exp: typeof claims.exp === "number" ? claims.exp : undefined,
    };
  } catch {
    return null;
  }
}
