import { test, expect, type Page } from "@playwright/test";

/**
 * Fase 5: fluidez. Crear y ver trabajos en el panel lateral sin salir de la lista.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD en .env.local para correr estos flujos.");

async function iniciarSesion(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(EMAIL!);
  await page.getByLabel("Contraseña").fill(PASSWORD!);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/panel/);
}

test("nuevo trabajo se abre en el panel lateral y queda abierto en su detalle", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos");
  await page.getByRole("link", { name: /nuevo trabajo/i }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/trabajos\/nuevo$/);
  await panel.getByLabel(/^título/i).fill(`Trabajo ${SUFIJO}`);
  await panel.getByRole("button", { name: /crear trabajo/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos\/[0-9a-f-]{36}$/);
  await expect(panel.getByRole("heading", { name: `Trabajo ${SUFIJO}` })).toBeVisible();
  await panel.getByRole("button", { name: /^cerrar$/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos\/?$/);
  await expect(page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).first()).toBeVisible();
});

test("marcar una tarea se refleja al instante", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos");
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
  await page.goto("/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos$/);
});
