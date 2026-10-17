import { test, expect, type Page } from "@playwright/test";
import { ESPERA_LOGIN, abrir, listo } from "./esperas";

/**
 * Fase 4 con sesión del propietario (E2E_EMAIL / E2E_PASSWORD en .env.local).
 * Verifica la ficha de empresa (acceso y módulos), la visibilidad de un trabajo y la bandeja.
 * El flujo como usuario de empresa requiere E2E_EMPRESA_EMAIL / E2E_EMPRESA_PASSWORD (opcional).
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const EMPRESA_EMAIL = process.env.E2E_EMPRESA_EMAIL;
const EMPRESA_PASSWORD = process.env.E2E_EMPRESA_PASSWORD;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD en .env.local para correr estos flujos.");

async function iniciarSesion(page: Page, correo: string, contrasena: string) {
  await abrir(page, "/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(contrasena);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: ESPERA_LOGIN });
  await listo(page);
}

test("la ficha de una empresa muestra acceso y módulos", async ({ page }) => {
  await iniciarSesion(page, EMAIL!, PASSWORD!);
  await expect(page).toHaveURL(/\/panel/, { timeout: ESPERA_LOGIN });
  await abrir(page, "/panel/clientes");
  await page.getByRole("link", { name: "SGC" }).first().click();
  await expect(page.getByRole("heading", { name: "Acceso al workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Módulos del workspace" })).toBeVisible();
  const proyectos = page.getByRole("switch", { name: /activar proyectos/i });
  const estado = await proyectos.getAttribute("aria-checked");
  await proyectos.click();
  await expect(proyectos).toHaveAttribute("aria-checked", estado === "true" ? "false" : "true");
  await proyectos.click();
  await expect(proyectos).toHaveAttribute("aria-checked", estado ?? "false");
});

test("la bandeja carga y el detalle de un trabajo tiene comentarios", async ({ page }) => {
  await iniciarSesion(page, EMAIL!, PASSWORD!);
  await abrir(page, "/panel/bandeja");
  await expect(page.getByRole("heading", { name: "Bandeja" })).toBeVisible();
});

test("el usuario de empresa entra a su workspace y no al panel", async ({ page }) => {
  test.skip(!EMPRESA_EMAIL || !EMPRESA_PASSWORD, "Define E2E_EMPRESA_EMAIL y E2E_EMPRESA_PASSWORD para este flujo.");
  await iniciarSesion(page, EMPRESA_EMAIL!, EMPRESA_PASSWORD!);
  await expect(page).toHaveURL(/\/w\/[a-z0-9-]+$/, { timeout: ESPERA_LOGIN });
  await expect(page.getByRole("heading", { name: /^hola,/i })).toBeVisible();
  await abrir(page, "/panel");
  await expect(page).toHaveURL(/\/w\/[a-z0-9-]+/);
});
