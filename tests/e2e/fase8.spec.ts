import { test, expect, type Page } from "@playwright/test";
import { ESPERA_LOGIN, abrir, listo } from "./esperas";

/**
 * Fase 8: agendar una actividad desde el calendario, verla en la lista, marcarla hecha y eliminarla.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD en .env.local para correr estos flujos.");

async function iniciarSesion(page: Page) {
  await abrir(page, "/login");
  await page.getByLabel("Correo").fill(EMAIL!);
  await page.getByLabel("Contraseña").fill(PASSWORD!);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: ESPERA_LOGIN });
  await listo(page);
}

test("agenda una actividad, la marca hecha y la elimina", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/calendario?vista=lista");
  await page.getByRole("link", { name: /nueva actividad/i }).first().click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel(/^título/i).fill(`Reunión ${SUFIJO}`);
  await panel.getByRole("button", { name: /^agendar$/i }).click();
  await expect(page.getByText(`Reunión ${SUFIJO}`)).toBeVisible();

  await page.getByLabel(`Marcar "Reunión ${SUFIJO}" como hecha`).check();
  await expect(page.getByLabel(`Marcar "Reunión ${SUFIJO}" como hecha`)).toBeChecked();

  await page.getByRole("link", { name: new RegExp(`Reunión ${SUFIJO}`) }).click();
  await listo(page);
  await page.getByRole("dialog").getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/calendario/);
  await expect(page.getByText(`Reunión ${SUFIJO}`)).toHaveCount(0);
});

test("la bandeja muestra la sección de solicitudes", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/bandeja");
  await expect(page.getByRole("heading", { name: /^solicitudes/i })).toBeVisible();
});
