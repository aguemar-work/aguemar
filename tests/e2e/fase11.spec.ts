import { test, expect, type Page } from "@playwright/test";
import { ESPERA_LOGIN, abrir, listo } from "./esperas";
import { limpiarSufijo } from "./limpieza";

/**
 * Fase 11 (sprint 5): la empresa pregunta sobre su cotización, el propietario responde desde la Bandeja,
 * y la empresa ve su cuenta y elige sus avisos. Dos sesiones (propietario y empresa A de staging).
 * Requiere E2E_EMAIL / E2E_PASSWORD y E2E_EMPRESA_EMAIL / E2E_EMPRESA_PASSWORD en .env.local.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const EMPRESA_EMAIL = process.env.E2E_EMPRESA_EMAIL;
const EMPRESA_PASSWORD = process.env.E2E_EMPRESA_PASSWORD;
const URL_BASE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const ANON = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
const SUFIJO = `E2E ${Date.now().toString(36)}`;
const PREGUNTA = `¿Incluye el hosting? ${SUFIJO}`;
const RESPUESTA = `Sí, el primer año va incluido. ${SUFIJO}`;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD || !EMPRESA_EMAIL || !EMPRESA_PASSWORD, "Define las cuentas de staging en .env.local (npm run staging:cuentas).");
test.skip(!/\.test$/.test(EMAIL ?? ""), "Estos flujos solo corren con las cuentas de prueba de staging (correo .test), nunca con datos reales.");

let cotizacionId = "";

/** Sesión del propietario por API (import dinámico: el cargador CJS de Playwright no resuelve los "exports" del SDK). */
async function propietario() {
  const { createClient } = await import("@insforge/sdk");
  const c = createClient({ baseUrl: URL_BASE!, anonKey: ANON!, isServerMode: true });
  const { data, error } = await c.auth.signInWithPassword({ email: EMAIL!, password: PASSWORD! });
  if (error) throw new Error(`No pude entrar como propietario: ${error.message}`);
  return { c, uid: data!.user!.id as string };
}

test.beforeAll(async () => {
  if (!EMAIL || !PASSWORD || !/\.test$/.test(EMAIL)) return;
  // La cotización enviada de SGC (la empresa A de staging), con una línea; aceptarla es otro paso y no hace falta.
  const { c, uid } = await propietario();
  const sgc = await c.database.from("clientes").select("id").eq("slug", "sgc").single();
  const cot = await c.database
    .from("cotizaciones")
    .insert([{ owner_id: uid, cliente_id: sgc.data!.id, asunto: `Cotización ${SUFIJO} dudas`, area: "soporte", estado: "enviada", recordar_pago: false }])
    .select("id")
    .single();
  if (cot.error) throw new Error(`No pude crear la cotización de prueba: ${cot.error.message}`);
  cotizacionId = cot.data!.id as string;
  await c.database.from("cotizacion_items").insert([{ owner_id: uid, cotizacion_id: cotizacionId, descripcion: "Línea de prueba", unidad: "servicio", cantidad: 1, precio_unitario: 10000 }]);
});

// Aunque un test intermedio falle, se borra lo de esta corrida: los comentarios y la cotización (no aceptada).
test.afterAll(async () => {
  if (!EMAIL || !PASSWORD || !/\.test$/.test(EMAIL)) return;
  const { c } = await propietario();
  if (cotizacionId) await c.database.from("comentarios").delete().eq("entidad_id", cotizacionId);
  await limpiarSufijo(SUFIJO);
  // Los avisos de SGC quedan encendidos aunque el test de la cuenta se corte a la mitad.
  await c.database.from("clientes").update({ avisos_correo: true }).eq("slug", "sgc");
});

async function entrar(page: Page, correo: string, contrasena: string) {
  await abrir(page, "/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: ESPERA_LOGIN });
  await listo(page);
}

test("la empresa pregunta sobre su cotización antes de aceptar", async ({ page }) => {
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  await entrar(page, EMPRESA_EMAIL!, EMPRESA_PASSWORD!);
  await abrir(page, `/w/sgc/cotizaciones/${cotizacionId}`);
  // La casilla de conformidad explica por qué el botón está apagado.
  await expect(page.getByText("Marca la conformidad para habilitar el botón.")).toBeVisible();
  await expect(page.getByText("¿Tienes dudas?")).toBeVisible();
  await page.getByLabel("Nuevo comentario").fill(PREGUNTA);
  await page.getByRole("button", { name: /^enviar$/i }).click();
  await expect(page.getByText(PREGUNTA)).toBeVisible();
});

test("el propietario responde desde la Bandeja, en la misma tarjeta", async ({ page }) => {
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  await entrar(page, EMAIL!, PASSWORD!);
  await abrir(page, "/panel/bandeja");
  const tarjeta = page.getByRole("listitem").filter({ hasText: PREGUNTA });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.getByRole("link", { name: new RegExp(`Cotización ${SUFIJO}`) })).toBeVisible();
  await tarjeta.getByRole("button", { name: /^responder$/i }).click();
  await tarjeta.getByLabel(/tu respuesta/i).fill(RESPUESTA);
  await tarjeta.getByRole("button", { name: /^enviar$/i }).click();
  await expect(page.getByText("Respuesta enviada.")).toBeVisible();
});

test("la empresa ve la respuesta y gestiona su cuenta", async ({ page }) => {
  test.skip(test.info().project.name !== "escritorio", "Solo en escritorio.");
  await entrar(page, EMPRESA_EMAIL!, EMPRESA_PASSWORD!);
  await abrir(page, `/w/sgc/cotizaciones/${cotizacionId}`);
  await expect(page.getByText(RESPUESTA)).toBeVisible();

  // Mi cuenta: el correo con el que entra, los pasos de la contraseña y el interruptor de avisos.
  await abrir(page, "/w/sgc/cuenta");
  await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
  await expect(page.getByText(EMPRESA_EMAIL!, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /enviarme un código/i })).toBeVisible();
  const avisos = page.getByRole("switch");
  await expect(avisos).toHaveAttribute("aria-checked", "true");
  await avisos.click();
  await expect(page.getByText("Apagamos los avisos por correo.")).toBeVisible();
  await expect(avisos).toHaveAttribute("aria-checked", "false");
  await avisos.click();
  await expect(page.getByText("Te avisaremos por correo.")).toBeVisible();
  await expect(avisos).toHaveAttribute("aria-checked", "true");
});
