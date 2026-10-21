import { afterEach, describe, expect, it, vi } from "vitest";
import { correoHtml, correoTexto, escapar } from "@/lib/correo/plantilla";
import { enviarCorreo } from "@/lib/correo/enviar";
import { armarCopiaAceptacion } from "@/lib/correo/copia-aceptacion";

const datos = {
  rotulo: "// comentario",
  titulo: "SGC te dejó un comentario",
  parrafos: ["En «Web corporativa»."],
  cita: "¿Podemos <b>adelantar</b> la entrega?\nGracias",
  boton: { texto: "Responder", url: "https://aguemar.com/panel/trabajos/1?a=1&b=2" },
  pie: "Aviso automático de aguemar Studio.",
};

describe("plantilla de correo", () => {
  it("escapa el contenido y mantiene los saltos de línea", () => {
    expect(escapar(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    const html = correoHtml(datos);
    expect(html).toContain("¿Podemos &lt;b&gt;adelantar&lt;/b&gt; la entrega?<br>Gracias");
    expect(html).toContain('href="https://aguemar.com/panel/trabajos/1?a=1&amp;b=2"');
    expect(html).not.toContain("<b>adelantar");
  });

  it("escribe la marca en minúsculas (aguemar, nunca agueMar)", () => {
    const html = correoHtml(datos);
    expect(html).toContain('ague<span style="color:#1CE783">mar</span>');
    expect(html.replace(/<[^>]+>/g, "")).not.toMatch(/agueMar/);
  });

  it("arma la versión en texto plano", () => {
    const texto = correoTexto(datos);
    expect(texto).toContain("> ¿Podemos <b>adelantar</b> la entrega?\n> Gracias");
    expect(texto).toContain("Responder: https://aguemar.com/panel/trabajos/1?a=1&b=2");
    expect(texto.endsWith("Aviso automático de aguemar Studio.")).toBe(true);
  });
});

describe("envío con Resend", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sin API key no envía nada", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect(await enviarCorreo({ ...datos, para: "ana@empresa.pe", asunto: "Hola" })).toEqual({ ok: false, omitido: "sin RESEND_API_KEY" });
    expect(f).not.toHaveBeenCalled();
  });

  it("con API key llama a Resend con remitente, destinatario y reply_to", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubEnv("RESEND_FROM", "aguemar <avisos@aguemar.com>");
    const f = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", f);
    const r = await enviarCorreo({ ...datos, para: "ana@empresa.pe", asunto: "Hola", responderA: "yo@aguemar.com" });
    expect(r.ok).toBe(true);
    const [urlLlamada, init] = f.mock.calls[0] as [string, RequestInit];
    expect(urlLlamada).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_prueba");
    const cuerpo = JSON.parse(init.body as string);
    expect(cuerpo).toMatchObject({ from: "aguemar <avisos@aguemar.com>", to: ["ana@empresa.pe"], subject: "Hola", reply_to: "yo@aguemar.com" });
  });

  it("no envía a correos inválidos ni rompe si Resend falla", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("dominio no verificado", { status: 403 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await enviarCorreo({ ...datos, para: "no-es-correo", asunto: "x" })).omitido).toBe("destinatario inválido");
    expect((await enviarCorreo({ ...datos, para: "ana@empresa.pe", asunto: "x" })).ok).toBe(false);
  });
});

describe("constancia de aceptación (T-31)", () => {
  const base = {
    saludo: "Hola Ana,",
    numero: "COT-2026-004",
    asunto: "Web corporativa",
    nombre: "Ana Pérez",
    fecha: "21/10/2026 14:03",
    version: "v2 · 3fa91c0b",
    url: "https://aguemar.com/d/abc",
  };

  it("dice quién aceptó y cómo, y lleva la versión que imprime el PDF", () => {
    const e = armarCopiaAceptacion({ ...base, por: "propietario" });
    expect(e.asunto).toBe("Constancia de aceptación COT-2026-004: Web corporativa");
    expect(e.parrafos).toContain("Aceptada por Ana Pérez el 21/10/2026 14:03 · registrada por aguemar.");
    expect(e.parrafos.join("\n")).toContain("Versión aceptada: v2 · 3fa91c0b");
    expect(e.boton).toEqual({ texto: "Ver la cotización aceptada", url: "https://aguemar.com/d/abc" });
    // La plantilla escapa y mantiene el rótulo en minúsculas.
    expect(correoHtml({ ...e, pie: "x" })).toContain("// cotización aceptada");
  });

  it("el rótulo cambia según el camino de la aceptación", () => {
    const texto = (por: "empresa" | "portal" | "propietario") => armarCopiaAceptacion({ ...base, por }).parrafos[2];
    expect(texto("empresa")).toMatch(/desde su espacio\.$/);
    expect(texto("portal")).toMatch(/por enlace\.$/);
    expect(texto("propietario")).toMatch(/registrada por aguemar\.$/);
  });

  it("sin versión no inventa un código", () => {
    const e = armarCopiaAceptacion({ ...base, por: "portal", version: null, numero: null });
    expect(e.asunto).toBe("Constancia de aceptación: Web corporativa");
    expect(e.parrafos.join("\n")).not.toContain("Versión aceptada");
  });
});
