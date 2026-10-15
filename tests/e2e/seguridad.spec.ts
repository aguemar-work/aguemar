import { test, expect } from "@playwright/test";

/**
 * Aislamiento del workspace contra la base, sin navegador ni servidor: la sesión de una empresa
 * no lee ni escribe tablas directamente; solo ve lo suyo, visible y publicado, a través de ws_*.
 * Requiere E2E_EMPRESA_EMAIL / E2E_EMPRESA_PASSWORD (y las variables de InsForge) en .env.local.
 */
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const EMAIL = process.env.E2E_EMPRESA_EMAIL;
const PASSWORD = process.env.E2E_EMPRESA_PASSWORD;

test.describe.configure({ mode: "serial" });
test.skip(!URL_BASE || !ANON || !EMAIL || !PASSWORD, "Define E2E_EMPRESA_EMAIL y E2E_EMPRESA_PASSWORD en .env.local.");

async function sesionEmpresa() {
  // Una sola pasada basta: no depende del dispositivo.
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  // Import dinámico: el cargador CJS de Playwright no resuelve los "exports" del SDK.
  const { createClient } = await import("@insforge/sdk");
  const c = createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
  const { error } = await c.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
  expect(error).toBeNull();
  return c;
}

const TABLAS = ["clientes", "trabajos", "trabajo_tareas", "cotizaciones", "cobros", "fichas", "briefs", "actas_entrega", "informes", "actividades", "solicitudes", "comentarios", "leads", "perfil_marca", "enlaces_publicos"];

test("la empresa no lee tablas directamente", async () => {
  const c = await sesionEmpresa();
  for (const tabla of TABLAS) {
    const { data, error } = await c.database.from(tabla).select("*").limit(5);
    // Sin políticas para la empresa: o la base niega el acceso o devuelve vacío, nunca filas.
    expect(error ? [] : data, `tabla ${tabla}`).toEqual([]);
  }
});

test("la empresa no escribe tablas directamente", async () => {
  const c = await sesionEmpresa();
  const intentos = [
    c.database.from("comentarios").insert([{ entidad: "trabajo", entidad_id: "00000000-0000-0000-0000-000000000000", texto: "x", es_propietario: true, leido: true }]),
    c.database.from("solicitudes").insert([{ titulo: "x" }]),
    c.database.from("trabajos").update({ titulo: "hackeado" }).neq("id", "00000000-0000-0000-0000-000000000000").select("id"),
    c.database.from("clientes").update({ modulos: ["proyectos", "calendario", "informes", "documentos", "cotizaciones", "equipos", "solicitudes"] }).neq("id", "00000000-0000-0000-0000-000000000000").select("id"),
  ];
  for (const r of await Promise.all(intentos)) {
    expect(r.error !== null || (Array.isArray(r.data) && r.data.length === 0)).toBe(true);
  }
});

test("lo que ve por ws_* es solo suyo, visible y sin notas internas", async () => {
  const c = await sesionEmpresa();
  const empresa = (await c.database.rpc("ws_mi_empresa")).data as { id: string; nombre: string } | null;
  expect(empresa?.id).toBeTruthy();
  const trabajos = ((await c.database.rpc("ws_trabajos")).data ?? []) as Record<string, unknown>[];
  for (const t of trabajos) {
    expect(t).not.toHaveProperty("notas");
    expect(t).not.toHaveProperty("monto_estimado");
    expect(t).not.toHaveProperty("visible_empresa");
  }
  const informes = ((await c.database.rpc("ws_informes")).data ?? []) as Record<string, unknown>[];
  for (const i of informes) expect(i).not.toHaveProperty("notas");
  // Funciones del panel: sin ser el dueño no devuelven nada.
  expect((await c.database.rpc("panel_resumen")).data?.empresas ?? 0).toBe(0);
});
