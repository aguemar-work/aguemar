import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
let conBase = true;
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/datos/landing", () => ({ clienteAnonimo: () => (conBase ? { database: { rpc } } : null) }));
vi.mock("@/lib/correo/avisos", () => ({ avisarLead: () => {} }));

const { enviarContacto } = await import("@/app/acciones");
const { reiniciarRespaldo, respaldoPermitido } = await import("@/lib/correo/respaldo-lead");
const { SIN_CANAL } = await import("@/lib/validators/lead");
const { conTextoWhatsApp } = await import("@/lib/landing");

const datos = { nombre: "Ana Pérez", telefono: "924262338", correo: "ana@empresa.pe", mensaje: "Necesito una web para mi empresa.", sitio_web: "" };

describe("lead garantizado", () => {
  let resend: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    conBase = true;
    rpc.mockReset();
    reiniciarRespaldo();
    vi.stubEnv("RESEND_API_KEY", "re_prueba");
    vi.stubEnv("AVISOS_PARA", "yo@aguemar.com");
    resend = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", resend);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("el tope global de la base (hint tope_global) no rechaza al visitante: el mensaje sale por el respaldo", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", hint: "tope_global", message: "Hay muchos mensajes en este momento." } });
    expect(await enviarContacto(datos)).toEqual({ ok: true, data: undefined });
    expect(resend).toHaveBeenCalledOnce();
  });

  it("el tope por IP (hint tope_ip) sigue rechazando y no usa el respaldo", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0001", hint: "tope_ip", message: "Demasiados envíos desde esta dirección. Intenta en una hora." } });
    const r = await enviarContacto(datos);
    expect(r.ok).toBe(false);
    expect(resend).not.toHaveBeenCalled();
  });

  it("con la base bien, guarda y no usa el respaldo", async () => {
    rpc.mockResolvedValue({ data: "id", error: null });
    expect(await enviarContacto(datos)).toEqual({ ok: true, data: undefined });
    expect(resend).not.toHaveBeenCalled();
  });

  it("si crear_lead falla, el mensaje llega por correo y quien escribe ve éxito", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "upstream connect error" } });
    expect((await enviarContacto(datos)).ok).toBe(true);
    const cuerpo = JSON.parse((resend.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(cuerpo.to).toEqual(["yo@aguemar.com"]);
    expect(cuerpo.reply_to).toBe("ana@empresa.pe");
    expect(cuerpo.subject).toContain("no quedó en Leads");
    expect(cuerpo.text).toContain("Necesito una web para mi empresa.");
  });

  it("si la base lanza o no está configurada, también respalda", async () => {
    rpc.mockRejectedValue(new Error("fetch failed"));
    expect((await enviarContacto(datos)).ok).toBe(true);
    conBase = false;
    expect((await enviarContacto(datos)).ok).toBe(true);
    expect(resend).toHaveBeenCalledTimes(2);
  });

  it("el límite de envíos y los datos inválidos no se respaldan", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Demasiados envíos desde esta dirección. Intenta en una hora." } });
    const r = await enviarContacto(datos);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.campo).toBeUndefined();
    rpc.mockResolvedValue({ data: null, error: { message: "Algún dato es demasiado largo.", code: "22001" } });
    expect((await enviarContacto(datos)).ok).toBe(false);
    expect(resend).not.toHaveBeenCalled();
  });

  it("sin AVISOS_PARA o si Resend falla, responde SIN_CANAL para ofrecer WhatsApp", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "upstream connect error" } });
    vi.stubEnv("AVISOS_PARA", "");
    let r = await enviarContacto(datos, "en");
    expect(r).toMatchObject({ ok: false, campo: SIN_CANAL });
    expect(!r.ok && r.error).toContain("WhatsApp");
    vi.stubEnv("AVISOS_PARA", "yo@aguemar.com");
    resend.mockResolvedValue(new Response("dominio no verificado", { status: 403 }));
    r = await enviarContacto(datos);
    expect(r).toMatchObject({ ok: false, campo: SIN_CANAL });
  });

  it("el respaldo tiene un tope de 3 por hora e IP", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => respaldoPermitido("1.1.1.1", t))).toEqual([true, true, true]);
    expect(respaldoPermitido("1.1.1.1", t + 1000)).toBe(false);
    expect(respaldoPermitido("2.2.2.2", t + 1000)).toBe(true);
    expect(respaldoPermitido("1.1.1.1", t + 60 * 60 * 1000 + 1)).toBe(true);
  });

  it("arma el enlace de WhatsApp con el mensaje ya escrito", () => {
    expect(conTextoWhatsApp("https://wa.me/51924262338?text=Hola", "Hola, soy Ana. Necesito una web")).toBe("https://wa.me/51924262338?text=Hola%2C%20soy%20Ana.%20Necesito%20una%20web");
  });
});
