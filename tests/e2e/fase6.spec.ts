import { test, expect, type Page } from "@playwright/test";
import { EN_PRODUCCION, ESPERA_LOGIN, MOTIVO_PANEL_NO_REFRESCA, abrir, listo } from "./esperas";
import { limpiarSufijo } from "./limpieza";

/**
 * Fase 6: cotización → envío → aceptación (crea el trabajo) → cobro → saldo.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y al menos una empresa y un servicio con precio.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD en .env.local para correr estos flujos.");
test.skip(!/\.test$/.test(EMAIL ?? ""), "Estos flujos solo corren con las cuentas de prueba de staging (correo .test), nunca con datos reales.");

// Aunque un test intermedio falle (y la serie salte su "limpieza"), se borra lo que creó esta corrida.
test.afterAll(() => limpiarSufijo(SUFIJO));

async function iniciarSesion(page: Page) {
  await abrir(page, "/login");
  await page.getByLabel("Correo").fill(EMAIL!);
  await page.getByLabel("Contraseña").fill(PASSWORD!);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: ESPERA_LOGIN });
  await listo(page);
}

let urlCotizacion = "";

test("arma una cotización con una línea libre y ve el total con IGV", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/cotizaciones/nueva");
  await page.getByLabel(/^empresa\s*\*?$/i).selectOption({ index: 1 });
  await page.getByLabel(/^asunto/i).fill(`Cotización ${SUFIJO}`);
  await page.getByRole("button", { name: /línea libre/i }).click();
  await page.getByLabel("Descripción").first().fill("Desarrollo de landing");
  await page.getByLabel("Precio unit.").first().fill("1000");
  // 1000 + 18 % = 1180
  await expect(page.getByText("S/ 1 180,00")).toBeVisible();
  await page.getByRole("button", { name: /guardar borrador/i }).click();
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/[0-9a-f-]{36}$/);
  urlCotizacion = page.url();
  await expect(page.getByRole("heading", { name: `Cotización ${SUFIJO}` })).toBeVisible();
});

test("el PDF se genera", async ({ page, request }) => {
  await iniciarSesion(page);
  const r = await page.request.get(`${urlCotizacion}/pdf`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/pdf");
  expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
  void request;
});

test("envía, acepta (crea el trabajo) y registra un cobro parcial", async ({ page }) => {
  test.fixme(EN_PRODUCCION, MOTIVO_PANEL_NO_REFRESCA);
  await iniciarSesion(page);
  await abrir(page, urlCotizacion);
  await page.getByRole("button", { name: /^enviar$/i }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /marcar aceptada/i }).click();
  await page.getByLabel("Quién acepta").fill("Persona de prueba");
  await page.getByRole("button", { name: /aceptar y crear trabajo/i }).click();
  await expect(page.getByText("Trabajo creado")).toBeVisible();
  await page.getByRole("button", { name: /registrar cobro/i }).click();
  await page.getByLabel("Monto").fill("500");
  await page.getByRole("button", { name: /^registrar$/i }).click();
  await expect(page.getByText("S/ 680,00")).toBeVisible(); // saldo 1180 − 500
});

test("limpieza: elimina el cobro y el trabajo de prueba (la cotización aceptada queda como registro)", async ({ page }) => {
  test.fixme(EN_PRODUCCION, "Depende del test anterior, en cuarentena. " + MOTIVO_PANEL_NO_REFRESCA);
  await iniciarSesion(page);
  await abrir(page, urlCotizacion);
  // Una cotización aceptada no se elimina desde la app: queda con el sufijo E2E para identificarla.
  page.on("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /eliminar cobro/i }).click();
  // Esperar a que el cobro desaparezca: navegar con la acción en curso la deja a medias (pasaba en móvil).
  await expect(page.getByRole("button", { name: /eliminar cobro/i })).toHaveCount(0);
  await page.getByText("Trabajo creado").click();
  await expect(page).toHaveURL(/\/panel\/trabajos\/[0-9a-f-]{36}/);
  await page.getByRole("button", { name: /^eliminar$/i }).first().click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos$/);
});
