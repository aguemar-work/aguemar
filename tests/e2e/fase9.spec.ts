import { test, expect, type Page } from "@playwright/test";

/**
 * Fase 9: crear un informe de avance, armarlo con lo del periodo, publicarlo, ver su PDF y eliminarlo.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y al menos una empresa.
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

test("crea, arma, publica y elimina un informe", async ({ page }) => {
  await iniciarSesion(page);
  await page.goto("/panel/informes/nuevo");
  const empresa = page.getByLabel(/^empresa/i);
  await empresa.selectOption({ index: 1 });
  await page.getByRole("button", { name: /armar con lo del periodo/i }).click();
  await expect(page.getByLabel("Texto de la sección 1")).toBeVisible();
  await page.getByLabel(/^título/i).fill(`Informe ${SUFIJO}`);
  await page.getByLabel("Texto de la sección 1").fill("- Revisión general\n- Ajustes de la web");
  await page.getByRole("button", { name: /guardar borrador/i }).click();
  await expect(page).toHaveURL(/\/panel\/informes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /INF-\d{4}-\d{3}/ })).toBeVisible();

  await page.getByRole("button", { name: /^publicar$/i }).click();
  await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible();

  const pdf = await page.request.get(`${page.url()}/pdf`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /eliminar informe/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/informes$/);
  await expect(page.getByText(`Informe ${SUFIJO}`)).toHaveCount(0);
});
