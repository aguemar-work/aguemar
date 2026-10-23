import { test, expect, type Page } from "@playwright/test";
import { ESPERA_LENTA, ESPERA_LOGIN, abrir, listo } from "./esperas";
import { limpiarSufijo } from "./limpieza";

/**
 * Fase 9: crear un informe de avance, armarlo con lo del periodo, publicarlo, ver su PDF y eliminarlo.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y al menos una empresa.
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
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD!);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(/\/panel/, { timeout: ESPERA_LOGIN });
  await listo(page);
}

test("crea, arma, publica y elimina un informe", async ({ page }) => {
  await iniciarSesion(page);
  // Camino normal: desde la lista, el informe nuevo se abre en el panel lateral.
  await abrir(page, "/panel/informes");
  await page.getByRole("link", { name: /nuevo informe/i }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(page).toHaveURL(/\/panel\/informes\/nuevo/);
  await listo(page);
  // Todo dentro del panel: la lista de abajo también tiene un filtro "Empresa".
  const empresa = panel.getByLabel(/^empresa/i);
  await empresa.selectOption({ index: 1 });
  await panel.getByRole("button", { name: /armar con lo del periodo/i }).click();
  await expect(panel.getByLabel("Texto de la sección 1")).toBeVisible();
  await panel.getByRole("textbox", { name: "Título", exact: true }).fill(`Informe ${SUFIJO}`);
  await panel.getByLabel("Texto de la sección 1").fill("- Revisión general\n- Ajustes de la web");
  await panel.getByRole("button", { name: /guardar borrador/i }).click();
  await expect(page).toHaveURL(/\/panel\/informes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /INF-\d{4}-\d{3}/ })).toBeVisible();

  await page.getByRole("button", { name: /^publicar$/i }).click();
  // Al publicar se abre el mensaje para la empresa; cerrado, se ve el estado.
  await expect(page.getByRole("dialog", { name: /mensaje para/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^despublicar$/i })).toBeVisible({ timeout: ESPERA_LENTA });
  await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible();

  const pdf = await page.request.get(`${page.url()}/pdf`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");

  await page.getByRole("button", { name: /eliminar informe/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/informes$/);
  await expect(page.getByText(`Informe ${SUFIJO}`)).toHaveCount(0);
});
