import path from "node:path";
import { ESPERA_LOGIN, abrir, listo } from "./esperas";
import { test, expect, type Page } from "@playwright/test";

/**
 * Fase 7a: ficha técnica con diagnóstico importado → publicar → portal público con QR → eliminar.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local y al menos una empresa.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;
const DIAGNOSTICO = path.join(__dirname, "..", "fixtures", "diagnostico-ejemplo.json");

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

let urlFicha = "";

test("crea una ficha importando el diagnóstico del script", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/fichas/nueva");
  await page.getByLabel("Empresa").selectOption({ index: 1 });
  await page.getByRole("button", { name: /importar diagnóstico/i }).click();
  await page.locator('input[type="file"]').setInputFiles(DIAGNOSTICO);
  await expect(page.getByText("99,7 % de la capacidad de diseño · 392 ciclos")).toBeVisible();
  await page.getByRole("button", { name: /aplicar a la ficha/i }).click();
  await page.getByLabel(/^titular/i).fill(`Ficha ${SUFIJO}`);
  await page.getByRole("button", { name: /guardar borrador/i }).click();
  await expect(page).toHaveURL(/\/panel\/fichas\/[0-9a-f-]{36}$/);
  urlFicha = page.url();
  await expect(page.getByText(`Ficha ${SUFIJO}`).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diagnóstico inicial" }).first()).toBeVisible();
});

test("el PDF de la ficha se genera", async ({ page }) => {
  await iniciarSesion(page);
  const r = await page.request.get(`${urlFicha}/pdf`);
  expect(r.status()).toBe(200);
  expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("al publicarla, el enlace público la muestra sin sesión", async ({ page, browser }) => {
  await iniciarSesion(page);
  await abrir(page, urlFicha);
  await page.getByRole("button", { name: /^publicar$/i }).click();
  const mensaje = page.getByRole("dialog");
  await expect(mensaje).toBeVisible();
  const texto = (await mensaje.locator("p").last().textContent()) ?? "";
  await page.keyboard.press("Escape");
  const enlace = /\/d\/[A-Za-z0-9_-]+/.exec(texto)?.[0];
  test.skip(!enlace, "La empresa tiene workspace: el mensaje lleva su espacio, no el portal.");
  const anonimo = await browser.newContext();
  const portal = await anonimo.newPage();
  await portal.goto(enlace!);
  await expect(portal.getByText(/ficha auténtica/i)).toBeVisible();
  await expect(portal.getByText(`Ficha ${SUFIJO}`)).toBeVisible();
  await anonimo.close();
});

test("limpieza: elimina la ficha de prueba", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, urlFicha);
  await page.getByRole("button", { name: /eliminar ficha/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  // Las fichas viven en el listado general de documentos.
  await expect(page).toHaveURL(/\/panel\/(fichas|documentos)/);
});
