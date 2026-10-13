import { test, expect } from "@playwright/test";

/**
 * Flujos base de la Fase 1 (sin sesión). Los flujos completos (cliente, cotización,
 * portal, ficha) se agregan en sus fases.
 */
test("la landing carga con el logo y los llamados a la acción", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "agueMar" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /pedir cotización/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /whatsapp/i })).toBeVisible();
});

test("la pantalla de login valida el correo antes de entrar", async ({ page }) => {
  await page.goto("/login");
  const correo = page.getByLabel("Correo");
  await expect(correo).toBeVisible();
  await correo.fill("no-es-un-correo");
  await page.getByLabel("Contraseña").fill("cualquiera");
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page.locator("#correo-error")).toContainText(/correo/i);
});

test("la recuperación de contraseña es accesible desde el login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /olvidaste/i }).click();
  await expect(page).toHaveURL(/\/login\/recuperar/);
  await expect(page.getByRole("heading", { name: /recuperar contraseña/i })).toBeVisible();
});

test("el panel redirige al login sin sesión", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/login\?siguiente=%2Fpanel|\/login/);
});

test("el portal es noindex", async ({ page }) => {
  await page.goto("/d/token-de-prueba");
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
});
