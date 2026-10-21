import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/datos/landing", () => ({ clienteAnonimo: () => ({ database: { rpc } }) }));
const sentry = vi.hoisted(() => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@sentry/nextjs", () => sentry);

const { correoRecordatorioPago, datosDePago, enviarRecordatoriosPago } = await import("@/lib/correo/recordatorio-pago");
type R = Parameters<typeof correoRecordatorioPago>[0];

const base: R = {
  id: "r1",
  tipo: "previo",
  cotizacion_id: "c1",
  numero: "COT-2026-005",
  asunto: "Web corporativa",
  moneda: "PEN",
  total: 123450,
  pendiente: 123450,
  vence_pago: "2026-10-21",
  dias_atraso: 0,
  empresa: { nombre: "SGC", contacto: "Ana María Pérez", correo: "ana@sgc.pe", slug: "sgc", modulos: ["cotizaciones"], con_acceso: true },
  enlace: "tok123",
  marca: { nombre_comercial: "aguemar", responsable: "Alejandro", correo: "hola@aguemar.com", telefono: null, pago_cuenta: "191-123", pago_cci: null, pago_yape: "987654321", pago_plin: null },
};
const SITIO = "https://aguemar.com/";

describe("correo de recordatorio de pago", () => {
  it("previo: fecha y monto en formato Perú, enlace a su espacio y datos de pago", () => {
    const e = correoRecordatorioPago(base, SITIO, "yo@aguemar.com");
    expect(e.para).toBe("ana@sgc.pe");
    expect(e.asunto).toBe("Recordatorio: tu pago de S/ 1 234,50 vence el 21/10/2026");
    expect(e.parrafos[0]).toBe("Hola Ana,");
    expect(e.parrafos[1]).toContain("COT-2026-005 («Web corporativa») vence el 21/10/2026");
    expect(e.parrafos[1]).not.toContain("Queda pendiente");
    expect(e.cita).toBe("Yape: 987654321\nCuenta: 191-123");
    expect(e.boton).toEqual({ texto: "Ver mi saldo", url: "https://aguemar.com/w/sgc/cotizaciones/c1" });
    expect(e.responderA).toBe("yo@aguemar.com");
    expect(e.pie).toContain("Si ya pagaste");
    expect(e.pie).toContain("SGC trabaja con aguemar");
  });

  it("pago parcial: dice cuánto queda de cuánto", () => {
    const e = correoRecordatorioPago({ ...base, pendiente: 50000 }, SITIO, null);
    expect(e.parrafos[1]).toContain("Queda pendiente S/ 500,00 de S/ 1 234,50.");
  });

  it("atrasos: asunto y título según el tipo", () => {
    const uno = correoRecordatorioPago({ ...base, tipo: "atraso_1", dias_atraso: 1 }, SITIO, null);
    expect(uno.asunto).toBe("Pago pendiente: COT-2026-005 venció el 21/10/2026");
    const siete = correoRecordatorioPago({ ...base, tipo: "atraso_7", dias_atraso: 12 }, SITIO, null);
    expect(siete.asunto).toBe("Seguimos esperando tu pago de COT-2026-005");
    expect(siete.titulo).toBe("Tu pago lleva 12 días pendiente");
  });

  it("sin acceso o sin el módulo usa el enlace público; sin enlace, no hay botón", () => {
    const sinAcceso = { ...base, empresa: { ...base.empresa, con_acceso: false } };
    expect(correoRecordatorioPago(sinAcceso, SITIO, null).boton?.url).toBe("https://aguemar.com/d/tok123");
    const sinModulo = { ...base, empresa: { ...base.empresa, modulos: ["proyectos"] } };
    expect(correoRecordatorioPago(sinModulo, SITIO, null).boton?.url).toBe("https://aguemar.com/d/tok123");
    expect(correoRecordatorioPago({ ...sinAcceso, enlace: null }, SITIO, null).boton).toBeNull();
  });

  it("sin datos de pago en Mi marca pide responder el correo", () => {
    const sinPago = { ...base, marca: { ...base.marca!, pago_cuenta: null, pago_yape: null } };
    expect(datosDePago(sinPago.marca)).toBeNull();
    const e = correoRecordatorioPago(sinPago, SITIO, null);
    expect(e.cita).toBeNull();
    expect(e.parrafos[2]).toContain("responde este correo");
  });
});

describe("tarea diaria", () => {
  beforeEach(() => rpc.mockReset());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sin Resend no toma nada de la base", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await enviarRecordatoriosPago("s")).toMatchObject({ tomados: 0, omitido: "sin RESEND_API_KEY" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("envía cada recordatorio y devuelve los fallidos para reintentar", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubEnv("AVISOS_PARA", "avisos@aguemar.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const otro = { ...base, id: "r2", empresa: { ...base.empresa, correo: "pagos@otra.pe" } };
    rpc.mockImplementation(async (fn: string) => (fn === "cobro_recordatorios_tomar" ? { data: [base, otro], error: null } : { data: 1, error: null }));
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const para = JSON.parse(init.body as string).to[0];
      return new Response("{}", { status: para === "pagos@otra.pe" ? 500 : 200 });
    });
    vi.stubGlobal("fetch", f);

    expect(await enviarRecordatoriosPago("secreto")).toEqual({ tomados: 2, enviados: 1, fallidos: 1 });
    expect(rpc).toHaveBeenCalledWith("cobro_recordatorios_tomar", { p_clave: "secreto" });
    expect(rpc).toHaveBeenCalledWith("cobro_recordatorios_fallidos", { p_clave: "secreto", p_ids: ["r2"] });
    expect(JSON.parse(f.mock.calls[0][1].body as string).reply_to).toBe("avisos@aguemar.com");
  });

  it("si la base rechaza la clave, lanza", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    rpc.mockResolvedValue({ data: null, error: { message: "No autorizado" } });
    await expect(enviarRecordatoriosPago("mala")).rejects.toThrow("No autorizado");
  });
});

const { GET } = await import("@/app/api/cron/recordatorios/route");

describe("ruta /api/cron/recordatorios", () => {
  const pedir = (auth?: string) => GET(new Request("http://localhost/api/cron/recordatorios", { headers: auth ? { authorization: auth } : {} }));

  beforeEach(() => rpc.mockReset());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sin CRON_SECRET configurado responde 503", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await pedir("Bearer x")).status).toBe(503);
  });

  it("sin cabecera o con otro secreto responde 401 y no toca la base", async () => {
    vi.stubEnv("CRON_SECRET", "s".repeat(43));
    expect((await pedir()).status).toBe(401);
    expect((await pedir("Bearer otro")).status).toBe(401);
    expect((await pedir("s".repeat(43))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("si la tarea falla responde 500 y avisa a Sentry", async () => {
    vi.stubEnv("CRON_SECRET", "s".repeat(43));
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.spyOn(console, "error").mockImplementation(() => {});
    sentry.captureException.mockClear();
    rpc.mockResolvedValue({ data: null, error: { message: "base caída" } });
    expect((await pedir(`Bearer ${"s".repeat(43)}`)).status).toBe(500);
    expect(sentry.captureException).toHaveBeenCalledOnce();
  });

  it("un 401 solo avisa a Sentry si lo pide Vercel Cron (secreto desalineado)", async () => {
    vi.stubEnv("CRON_SECRET", "s".repeat(43));
    sentry.captureMessage.mockClear();
    await pedir("Bearer otro");
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    await GET(new Request("http://localhost/api/cron/recordatorios", { headers: { authorization: "Bearer otro", "user-agent": "vercel-cron/1.0" } }));
    expect(sentry.captureMessage).toHaveBeenCalledOnce();
  });

  it("con el secreto ejecuta la tarea", async () => {
    vi.stubEnv("CRON_SECRET", "s".repeat(43));
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.spyOn(console, "info").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: [], error: null });
    const r = await pedir(`Bearer ${"s".repeat(43)}`);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ tomados: 0, enviados: 0, fallidos: 0 });
  });
});
