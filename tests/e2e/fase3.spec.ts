import { test, expect, type Page } from "@playwright/test";

/**
 * Flujo de Trabajos con sesión real (E2E_EMAIL / E2E_PASSWORD en .env.local).
 * Crea un trabajo con sufijo E2E, le agrega etapa y tarea, cambia el estado y lo elimina.
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

test("crea un trabajo de desarrollo sin cliente", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos/nuevo");
  await page.getByLabel(/^área/i).selectOption("desarrollo");
  await page.getByLabel(/^título/i).fill(`Trabajo ${SUFIJO}`);
  await page.getByLabel(/fecha comprometida/i).fill("2030-01-15");
  await page.getByLabel(/monto estimado/i).fill("1500,50");
  await page.getByRole("button", { name: /crear trabajo/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `Trabajo ${SUFIJO}` })).toBeVisible();
  await expect(page.getByText("S/ 1 500,50")).toBeVisible();
});

test("agrega etapa y tarea, y la marca como hecha", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).click();
  await page.getByLabel("Nueva etapa").fill("Diagnóstico");
  await page.getByRole("button", { name: /^etapa$/i }).click();
  await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible();
  await page.getByLabel("Nueva tarea").first().fill("Revisar requerimientos");
  await page.getByRole("button", { name: /^tarea$/i }).first().click();
  await expect(page.getByText("Revisar requerimientos")).toBeVisible();
  await page.getByLabel(/marcar tarea revisar requerimientos/i).check();
  await expect(page.getByText("1/1 · 100 %")).toBeVisible();
});

test("cambia el estado desde el detalle y lo ve en el tablero", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).click();
  await page.getByLabel("Estado").selectOption("en_curso");
  await expect(page.getByText("Estado actualizado.")).toBeVisible();
  await page.goto("/panel/trabajos?vista=tablero");
  const columna = page.getByRole("region", { name: /en curso/i });
  await expect(columna.getByRole("link", { name: `Trabajo ${SUFIJO}` })).toBeVisible();
});

test("limpieza: elimina el trabajo de prueba", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/trabajos");
  await page.getByRole("link", { name: `Trabajo ${SUFIJO}` }).click();
  await page.getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/trabajos$/);
  await expect(page.getByRole("link", { name: `Trabajo ${SUFIJO}` })).toHaveCount(0);
});
