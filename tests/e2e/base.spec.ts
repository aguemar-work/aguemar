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

test("la pantalla de login tiene el campo de correo accesible", async ({ page }) => {
  await page.goto("/login");
  const correo = page.getByLabel("Correo");
  await expect(correo).toBeVisible();
  await correo.fill("no-es-un-correo");
  await page.getByRole("button", { name: /enviarme el enlace/i }).click();
  await expect(page.locator("#correo-error")).toContainText(/correo/i);
});

test("el portal es noindex", async ({ page }) => {
  await page.goto("/d/token-de-prueba");
  const robots = page.locator('meta[name="robots"]');
  await expect(robots).toHaveAttribute("content", /noindex/);
});
