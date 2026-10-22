import { test, expect, type Page } from "@playwright/test";
import { EN_PRODUCCION, ESPERA_LOGIN, MOTIVO_PANEL_NO_REFRESCA, abrir, listo } from "./esperas";
import { limpiarSufijo } from "./limpieza";

/**
 * Fase 5: fluidez. Crear y ver trabajos en el panel lateral sin salir de la lista.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
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

test("nuevo trabajo se crea en el panel lateral y se abre su detalle con una carga normal", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/trabajos");
  await page.getByRole("link", { name: /nuevo trabajo/i }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/trabajos\/nuevo$/);
  await panel.getByLabel(/^título/i).fill(`Trabajo ${SUFIJO}`);
  await panel.getByRole("button", { name: /crear trabajo/i }).click();
  // Al crear, el detalle se abre como página completa (T-36, B-01): ya no hay panel lateral.
  await expect(page).toHaveURL(/\/panel\/trabajos\/[0-9a-f-]{36}$/);
  await listo(page);
  await expect(page.getByRole("heading", { name: `Trabajo ${SUFIJO}` })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Ver uno existente sí sigue abriéndose en el panel lateral sobre la lista.
  await abrir(page, "/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).first().click();
  await expect(panel.getByRole("heading", { name: `Trabajo ${SUFIJO}` })).toBeVisible();
  await panel.getByRole("button", { name: /^cerrar$/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos\/?$/);
});

test("marcar una tarea se refleja al instante", async ({ page }) => {
  test.fixme(EN_PRODUCCION, MOTIVO_PANEL_NO_REFRESCA);
  await iniciarSesion(page);
  await abrir(page, "/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).first().click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("Nueva tarea").first().fill("Tarea rápida");
  await panel.getByRole("button", { name: /^tarea$/i }).first().click();
  await panel.getByLabel(/marcar tarea tarea rápida/i).check();
  await expect(panel.getByLabel(/marcar tarea tarea rápida/i)).toBeChecked();
  await expect(panel.getByText("1/1 · 100 %")).toBeVisible();
});

test("limpieza: elimina el trabajo de prueba", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos$/);
});
