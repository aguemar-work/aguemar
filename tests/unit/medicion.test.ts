import { describe, expect, it } from "vitest";
import { ORIGENES, clasificarOrigen, describirOrigen, dominioReferente, utmDe } from "@/lib/origen";
import { DIAS_INACTIVA, estadoAcceso, etiquetaAcceso } from "@/lib/acceso-empresa";
import { origenLeadSchema } from "@/lib/validators/lead";
import { politicaCsp, urlReporteCsp } from "@/lib/csp";
import { limpiarEvento, redactarRuta, redactarTexto } from "@/lib/sentry";
import { readFileSync } from "node:fs";
import type { ErrorEvent } from "@sentry/nextjs";

describe("origen del lead", () => {
  it("clasifica por dominio", () => {
    expect(clasificarOrigen({ referente: "google.com.pe" })).toBe("google");
    expect(clasificarOrigen({ referente: "l.instagram.com" })).toBe("instagram");
    expect(clasificarOrigen({ referente: "lm.facebook.com" })).toBe("facebook");
    expect(clasificarOrigen({ referente: "t.co" })).toBe("x");
    expect(clasificarOrigen({ referente: "mail.google.com" })).toBe("correo");
    expect(clasificarOrigen({ referente: "blog.ejemplo.pe" })).toBe("otro");
    expect(clasificarOrigen({})).toBe("directo");
    expect(clasificarOrigen(null)).toBe("directo");
  });

  it("utm_source manda sobre el dominio", () => {
    expect(clasificarOrigen({ referente: "google.com", utm: { source: "ig" } })).toBe("instagram");
    expect(clasificarOrigen({ utm: { source: "volante-feria" } })).toBe("campana");
    expect(clasificarOrigen({ utm: { campaign: "octubre" } })).toBe("campana");
  });

  it("la lista coincide con la de la migración", () => {
    const sql = readFileSync("migrations/20261020210512_sprint2-medicion.sql", "utf8");
    const lista = sql.match(/origen in \(([^)]+)\)/)?.[1].match(/'([a-z]+)'/g)?.map((s) => s.slice(1, -1));
    expect(lista).toEqual([...ORIGENES]);
  });

  it("dominio del referente: sin www, sin el propio sitio y solo http(s)", () => {
    expect(dominioReferente("https://www.Google.com/search?q=x", "aguemar.com")).toBe("google.com");
    expect(dominioReferente("https://aguemar.com/en", "www.aguemar.com")).toBeNull();
    expect(dominioReferente("android-app://com.whatsapp")).toBeNull();
    expect(dominioReferente("no es url")).toBeNull();
  });

  it("lee y recorta las UTM", () => {
    expect(utmDe("?utm_source=ig&utm_medium=bio&x=1")).toEqual({ source: "ig", medium: "bio" });
    expect(utmDe("?utm_campaign=" + "a".repeat(200))?.campaign).toHaveLength(80);
    expect(utmDe("?q=1")).toBeNull();
  });

  it("describe el origen para el panel", () => {
    expect(describirOrigen("google", "google.com", { medium: "cpc", campaign: "otono" })).toBe("Google · cpc · otono");
    expect(describirOrigen("otro", "blog.pe", null)).toBe("Otro sitio · blog.pe");
    expect(describirOrigen("campana", null, { source: "volante" })).toBe("Campaña · volante");
    expect(describirOrigen(null, null, null)).toBeNull();
  });

  it("el esquema rechaza referentes que no son dominios", () => {
    expect(origenLeadSchema.safeParse({ referente: "evil.com/path?x" }).success).toBe(false);
    expect(origenLeadSchema.safeParse({ referente: "google.com", utm: { source: "ig" } }).success).toBe(true);
    expect(origenLeadSchema.safeParse({}).success).toBe(true);
  });
});

describe("estado del acceso de una empresa", () => {
  const ahora = new Date("2026-10-20T15:00:00-05:00");

  it("sin usuario: invitación pendiente, vencida o sin acceso", () => {
    expect(estadoAcceso({ usuarioId: null, ultimoIngreso: null, invitacion: { expira_en: "2026-10-25T00:00:00Z" } }, ahora)).toEqual({ tipo: "invitacion", vencida: false });
    expect(estadoAcceso({ usuarioId: null, ultimoIngreso: null, invitacion: { expira_en: "2026-10-01T00:00:00Z" } }, ahora)).toEqual({ tipo: "invitacion", vencida: true });
    expect(estadoAcceso({ usuarioId: null, ultimoIngreso: null, invitacion: null }, ahora).tipo).toBe("sin_acceso");
  });

  it("con usuario: días civiles en Lima", () => {
    expect(estadoAcceso({ usuarioId: "u", ultimoIngreso: null, invitacion: null }, ahora).tipo).toBe("sin_ingresar");
    // 00:30 en Lima del mismo día (05:30 UTC) cuenta como hoy.
    expect(estadoAcceso({ usuarioId: "u", ultimoIngreso: "2026-10-20T05:30:00Z", invitacion: null }, ahora)).toEqual({ tipo: "activa", dias: 0 });
    // 23:30 del 19 en Lima (04:30 UTC del 20) es ayer.
    expect(estadoAcceso({ usuarioId: "u", ultimoIngreso: "2026-10-20T04:30:00Z", invitacion: null }, ahora)).toEqual({ tipo: "activa", dias: 1 });
    expect(estadoAcceso({ usuarioId: "u", ultimoIngreso: "2026-09-20T17:00:00Z", invitacion: null }, ahora)).toEqual({ tipo: "inactiva", dias: DIAS_INACTIVA });
  });

  it("textos de la etiqueta", () => {
    expect(etiquetaAcceso({ tipo: "activa", dias: 0 }).texto).toBe("Activa · hoy");
    expect(etiquetaAcceso({ tipo: "activa", dias: 1 }).texto).toBe("Activa · ayer");
    expect(etiquetaAcceso({ tipo: "activa", dias: 12 }).texto).toBe("Activa · hace 12 días");
    expect(etiquetaAcceso({ tipo: "inactiva", dias: 45 }).texto).toBe("Sin ingresar hace 30+ días");
    expect(etiquetaAcceso({ tipo: "invitacion", vencida: false }).texto).toBe("Invitación pendiente");
  });
});

describe("alertas sin datos personales", () => {
  it("tapa los tokens y quita la query", () => {
    expect(redactarRuta("https://aguemar.com/d/abcDEF123_-x/pdf?descargar=1")).toBe("https://aguemar.com/d/[token]/pdf");
    expect(redactarRuta("/invitacion/tok123")).toBe("/invitacion/[token]");
    expect(redactarRuta("/panel/clientes/1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe("/panel/clientes/1b4e28ba-2fa1-11d2-883f-0016d3cca427");
  });

  it("quita correos, DNI y RUC de los mensajes, no los uuid", () => {
    expect(redactarTexto("No se pudo enviar a ana.perez@empresa.pe (DNI 45678912, RUC 20123456789)")).toBe(
      "No se pudo enviar a [correo] (DNI [número], RUC [número])",
    );
    expect(redactarTexto("fila 1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toContain("1b4e28ba-2fa1-11d2-883f-0016d3cca427");
  });

  it("el evento sale sin usuario, cabeceras, cookies ni breadcrumbs", () => {
    const evento = {
      user: { email: "a@b.pe", ip_address: "1.2.3.4" },
      request: { method: "GET", url: "https://aguemar.com/d/secreto?x=1", headers: { cookie: "s=1" }, cookies: { s: "1" }, data: { dni: "1" }, query_string: "x=1" },
      breadcrumbs: [{ message: "a@b.pe" }],
      extra: { cuerpo: "x" },
      transaction: "/invitacion/secreto",
      exception: { values: [{ type: "Error", value: "falló para a@b.pe" }] },
      contexts: { nextjs: { request_path: "/d/secreto", router_path: "/d/[token]" } },
    } as unknown as ErrorEvent;
    const limpio = limpiarEvento(evento)!;
    expect(limpio.user).toBeUndefined();
    expect(limpio.breadcrumbs).toBeUndefined();
    expect(limpio.extra).toBeUndefined();
    expect(limpio.request).toEqual({ method: "GET", url: "https://aguemar.com/d/[token]" });
    expect(limpio.transaction).toBe("/invitacion/[token]");
    expect(limpio.exception?.values?.[0].value).toBe("falló para [correo]");
    expect((limpio.contexts?.nextjs as Record<string, string>).request_path).toBe("/d/[token]");
  });
});

describe("CSP en modo reporte", () => {
  it("arma el endpoint de Sentry desde el DSN", () => {
    expect(urlReporteCsp("https://abc123@o42.ingest.us.sentry.io/789", "production")).toBe(
      "https://o42.ingest.us.sentry.io/api/789/security/?sentry_key=abc123&sentry_environment=production",
    );
    expect(urlReporteCsp(undefined)).toBeNull();
    expect(urlReporteCsp("no-es-dsn")).toBeNull();
  });

  it("no permite que otros sitios enmarquen la app ni carguen objetos", () => {
    const csp = politicaCsp();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("report-uri");
  });
});
