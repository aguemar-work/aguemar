import { test, expect } from "@playwright/test";

/** Fase 10: la landing pública (sin sesión). No envía el formulario para no crear leads de prueba. */
test("la landing muestra las secciones y el botón Ingresar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const nombre of ["Lo que hago", "Así se ve un trabajo terminado", "Lo que he construido", "Cómo trabajo", "Tu empresa, con su propio espacio", "Quién está detrás", "Conversemos"]) {
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Ingresar" }).first()).toHaveAttribute("href", "/login");
});

test("las pestañas de servicios y del espacio se recorren con el teclado", async ({ page }) => {
  await page.goto("/#desarrollo");
  await expect(page.getByRole("tab", { name: "// desarrollo", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#servicios")).toHaveAttribute("data-forma", "llaves");
  await page.getByRole("tab", { name: "// desarrollo", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "// soporte", exact: true })).toBeFocused();
  await expect(page.locator("#servicios")).toHaveAttribute("data-forma", "chip");

  await page.getByRole("tab", { name: /Sistema ITMS/ }).click();
  await expect(page.getByRole("tabpanel", { name: /Sistema ITMS/ })).toContainText("un solo uso");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("tab", { name: /Agenda y tareas/ })).toHaveAttribute("aria-selected", "true");

  await page.getByRole("tab", { name: "Cotizaciones" }).click();
  await expect(page.getByRole("tabpanel", { name: "Cotizaciones" })).toContainText("COT-2026-012");
});

test("con «reducir movimiento» no carga la escena 3D y todo se ve completo", async ({ browser }) => {
  const contexto = await browser.newContext({ reducedMotion: "reduce" });
  const page = await contexto.newPage();
  await page.goto("/");
  await page.waitForTimeout(2500);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/escena-3d/);
  await page.locator("#evidencia").scrollIntoViewIfNeeded();
  await expect(page.getByText("0 errores de integridad")).toBeVisible();
  await expect(page.getByRole("article", { name: /FT-2026-001/ })).toBeVisible();
  await contexto.close();
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
