import { test, expect } from "@playwright/test";

/** Fase 10: la landing pública (sin sesión). No envía el formulario para no crear leads de prueba. */
test("la landing muestra las secciones y el botón Ingresar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const nombre of ["Servicios", "Cómo trabajo", "Tu empresa, con su propio espacio", "Conversemos"]) {
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Ingresar" }).first()).toHaveAttribute("href", "/login");
});

test("el formulario de contacto valida antes de enviar", async ({ page }) => {
  await page.goto("/#contacto");
  await page.getByRole("button", { name: /enviar mensaje/i }).click();
  await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
  await page.getByLabel(/tu nombre/i).fill("Prueba");
  await page.getByLabel(/cuéntame/i).fill("Necesito una web corporativa para mi empresa.");
  await page.getByRole("button", { name: /enviar mensaje/i }).click();
  await expect(page.getByText(/déjame un whatsapp o un correo/i)).toBeVisible();
});

test("robots y sitemap dejan fuera el panel y los espacios", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /panel");
  expect(robots).toContain("Disallow: /w/");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
});
