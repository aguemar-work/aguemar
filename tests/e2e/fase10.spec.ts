import { test, expect } from "@playwright/test";

/** Fase 10: la landing pública (sin sesión). No envía el formulario para no crear leads de prueba. */
test("la landing muestra las secciones y el botón Ingresar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/RUC/)).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  for (const nombre of ["Lo que hago", "Lo que he construido", "Cómo trabajo", "Tu empresa, con su propio espacio", "Conversemos"]) {
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Ingresar" }).first()).toHaveAttribute("href", "/login");
});

test("servicios, proyectos y el espacio de ejemplo se muestran en filas", async ({ page }) => {
  await page.goto("/#desarrollo");
  for (const area of ["Diseño", "Desarrollo", "Soporte técnico"]) {
    await expect(page.getByRole("heading", { name: area, exact: true })).toBeVisible();
  }
  await expect(page.locator("#desarrollo")).toBeInViewport();
  // Las únicas pestañas son las del espacio de ejemplo.
  await expect(page.getByRole("tab")).toHaveCount(3);

  await expect(page.getByRole("heading", { name: /Sistema ITMS/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Agenda y tareas/ })).toBeVisible();
  await expect(page.locator("#proyectos")).toContainText("un solo uso");

  await page.getByRole("tab", { name: "Cotizaciones" }).click();
  await expect(page.getByRole("tabpanel", { name: "Cotizaciones" })).toContainText("COT-2026-012");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Proyectos" })).toHaveAttribute("aria-selected", "true");
});

test("en escritorio el menú marca la sección activa al bajar", async ({ page, isMobile }) => {
  test.skip(isMobile, "el menú lateral solo existe desde lg");
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "Secciones" });
  await expect(menu).toBeVisible();
  await page.locator("#proyectos").scrollIntoViewIfNeeded();
  await expect(menu.getByRole("link", { name: "Proyectos" })).toHaveAttribute("aria-current", "location");
  await expect(menu.getByRole("link", { name: "Servicios" })).not.toHaveAttribute("aria-current", "location");
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

test("la versión en inglés está en /en y el selector cambia de idioma", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("I'll show you.");
  for (const nombre of ["What I do", "What I've built", "How I work", "Your company, with its own space", "Let's talk"]) {
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "English" })).toHaveAttribute("aria-current", "true");
  await page.getByRole("link", { name: "Español" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("el formulario en inglés valida en inglés", async ({ page }) => {
  await page.goto("/en#contacto");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await page.getByLabel(/your name/i).fill("Test");
  await page.getByLabel(/tell me more/i).fill("I need a corporate website for my company.");
  await page.getByRole("button", { name: /send message/i }).click();
  await expect(page.getByText(/leave me a whatsapp number or an email/i)).toBeVisible();
});

test("robots y sitemap dejan fuera el panel y los espacios", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /panel");
  expect(robots).toContain("Disallow: /w/");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/en");
});
