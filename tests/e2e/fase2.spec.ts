import { test, expect, type Page } from "@playwright/test";
import { ESPERA_LOGIN, abrir, listo } from "./esperas";

/**
 * Flujos de la Fase 2 con sesión real. Requiere en .env.local:
 *   E2E_EMAIL=correo@propietario
 *   E2E_PASSWORD=contraseña
 * Si faltan, los tests se omiten. Crea datos con el sufijo "E2E" y los elimina al final.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;

/** RUC 20XXXXXXXX con su dígito verificador (módulo 11), distinto en cada corrida. */
function rucAleatorio(): string {
  const base = `20${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(base[i]), 0);
  return `${base}${(11 - (suma % 11)) % 10}`;
}
const RUC = rucAleatorio();

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

test("inicia sesión y ve el inicio con lo que pide atención", async ({ page }) => {
  await iniciarSesion(page);
  await expect(page.getByRole("region", { name: "Lo que pide atención" })).toBeVisible();
  await expect(page.getByText("Entregas vencidas")).toBeVisible();
});

test("crea un cliente con RUC válido y lo ve en el detalle", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/clientes/nuevo");
  await page.getByLabel(/razón social/i).fill(`Cliente ${SUFIJO}`);
  await page.getByLabel(/tipo de documento/i).selectOption("RUC");
  await page.getByLabel(/número de ruc/i).fill(RUC);
  await page.getByLabel(/persona de contacto/i).fill("Contacto E2E");
  await page.getByRole("button", { name: /crear empresa/i }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: `Cliente ${SUFIJO}` })).toBeVisible();
  await expect(page.getByText(`RUC ${RUC}`)).toBeVisible();
});

test("rechaza un RUC inválido sin salir del formulario", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/clientes/nuevo");
  await page.getByLabel(/razón social/i).fill("Inválido");
  await page.getByLabel(/número de ruc/i).fill("20131312956");
  await page.getByRole("button", { name: /crear empresa/i }).click();
  await expect(page.locator("#num_doc-error")).toContainText(/RUC/);
  await expect(page).toHaveURL(/\/panel\/clientes\/nuevo/);
});

test("registra un equipo del cliente y ve su historial vacío", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/clientes");
  await page.getByRole("link", { name: `Cliente ${SUFIJO}` }).click();
  await page.getByRole("link", { name: /nuevo equipo/i }).click();
  await expect(page.getByLabel(/^cliente/i)).toHaveValue(/[0-9a-f-]{36}/);
  await page.getByLabel(/marca/i).fill("Lenovo");
  await page.getByLabel(/modelo/i).fill(`Modelo ${SUFIJO}`);
  await page.getByLabel(/número de serie/i).fill(`SN-${SUFIJO.replace(/\s/g, "")}`);
  await page.getByRole("button", { name: /registrar equipo/i }).click();
  await expect(page).toHaveURL(/\/panel\/equipos\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Este equipo aún no tiene fichas.")).toBeVisible();
});

test("impide duplicar la serie para el mismo cliente", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/equipos/nuevo");
  await page.getByLabel(/^cliente/i).selectOption({ label: `Cliente ${SUFIJO}` });
  await page.getByLabel(/número de serie/i).fill(`SN-${SUFIJO.replace(/\s/g, "")}`);
  await page.getByRole("button", { name: /registrar equipo/i }).click();
  await expect(page.locator("#serie-error")).toContainText(/ya tiene un equipo/i);
});

test("limpieza: elimina el equipo y el cliente de prueba", async ({ page }) => {
  await iniciarSesion(page);
  // Páginas completas (no el panel lateral): así hay un solo botón "Eliminar" en pantalla.
  await abrir(page, "/panel/clientes");
  const urlCliente = await page.getByRole("link", { name: `Cliente ${SUFIJO}` }).first().getAttribute("href");
  await abrir(page, urlCliente!);
  const urlEquipo = await page.getByRole("link", { name: `Lenovo Modelo ${SUFIJO}` }).first().getAttribute("href");
  await abrir(page, urlEquipo!);
  await page.getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/[0-9a-f-]{36}$/);
  await abrir(page, urlCliente!);
  await page.getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
  await expect(page.getByRole("link", { name: `Cliente ${SUFIJO}` })).toHaveCount(0);
});

test("Servicios vive en Ajustes, con pestañas comunes a Mi marca, Plantillas y Equipo", async ({ page }) => {
  await iniciarSesion(page);
  if (test.info().project.name === "escritorio") {
    const ajustes = page.getByRole("navigation", { name: "Secciones del panel" }).getByRole("list", { name: "Ajustes" });
    await expect(ajustes.getByRole("link")).toHaveText(["Mi marca", "Servicios", "Plantillas", "Equipo"]);
  }
  await abrir(page, "/panel/servicios");
  const pestanas = page.getByRole("navigation", { name: "Ajustes" });
  await expect(pestanas.getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-current", "page");
  await pestanas.getByRole("link", { name: "Plantillas" }).click();
  await expect(page).toHaveURL(/\/panel\/plantillas$/);
  await expect(page.getByRole("heading", { name: "Plantillas de checklist" })).toBeVisible();
  await expect(pestanas.getByRole("link", { name: "Plantillas" })).toHaveAttribute("aria-current", "page");
  await pestanas.getByRole("link", { name: "Mi marca" }).click();
  await expect(page.getByRole("heading", { name: "Mi marca", level: 1 })).toBeVisible();
});
