import { test, expect, type Page } from "@playwright/test";
import { EN_PRODUCCION, ESPERA_LOGIN, MOTIVO_PANEL_NO_REFRESCA, abrir, listo } from "./esperas";
import { limpiarSufijo } from "./limpieza";

/**
 * Fase 8: agendar una actividad desde el calendario, verla en la lista, marcarla hecha y eliminarla.
 * Requiere E2E_EMAIL / E2E_PASSWORD en .env.local.
 */
const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const SUFIJO = `E2E ${Date.now().toString(36)}`;

test.describe.configure({ mode: "serial" });
test.skip(!EMAIL || !PASSWORD, "Define E2E_EMAIL y E2E_PASSWORD en .env.local para correr estos flujos.");
test.skip(!/\.test$/.test(EMAIL ?? ""), "Estos flujos solo corren con las cuentas de prueba de staging (correo .test), nunca con datos reales.");

// Aunque un test intermedio falle (y la serie salte su "limpieza"), se borra lo que creó esta corrida.
test.afterAll(() => limpiarSufijo(SUFIJO));

async function iniciarSesion(page: Page, correo = EMAIL!, clave = PASSWORD!, destino = /\/panel/) {
  await abrir(page, "/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña", { exact: true }).fill(clave);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await expect(page).toHaveURL(destino, { timeout: ESPERA_LOGIN });
  await listo(page);
}

test("agenda una actividad, la marca hecha y la elimina", async ({ page }) => {
  test.fixme(EN_PRODUCCION, MOTIVO_PANEL_NO_REFRESCA);
  await iniciarSesion(page);
  await abrir(page, "/panel/calendario?vista=lista");
  await page.getByRole("link", { name: /nueva actividad/i }).first().click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel(/^título/i).fill(`Reunión ${SUFIJO}`);
  await panel.getByRole("button", { name: /^agendar$/i }).click();
  await expect(page.getByText(`Reunión ${SUFIJO}`)).toBeVisible();

  await page.getByLabel(`Marcar "Reunión ${SUFIJO}" como hecha`).check();
  await expect(page.getByLabel(`Marcar "Reunión ${SUFIJO}" como hecha`)).toBeChecked();

  await page.getByRole("link", { name: new RegExp(`Reunión ${SUFIJO}`) }).click();
  await listo(page);
  await page.getByRole("dialog").getByRole("button", { name: /^eliminar$/i }).click();
  await page.getByRole("button", { name: /sí, eliminar/i }).click();
  await expect(page).toHaveURL(/\/panel\/calendario/);
  await expect(page.getByText(`Reunión ${SUFIJO}`)).toHaveCount(0);
});

test("la bandeja muestra la sección de solicitudes", async ({ page }) => {
  await iniciarSesion(page);
  await abrir(page, "/panel/bandeja");
  await expect(page.getByRole("heading", { name: /^solicitudes/i })).toBeVisible();
});

test("la empresa pide una reunión desde su calendario y el propietario la confirma", async ({ page, browser }) => {
  test.fixme(EN_PRODUCCION, MOTIVO_PANEL_NO_REFRESCA);
  test.skip(!process.env.E2E_EMPRESA_EMAIL || !process.env.E2E_EMPRESA_PASSWORD, "Define E2E_EMPRESA_EMAIL y E2E_EMPRESA_PASSWORD para este flujo.");
  const tema = `Reunión ${SUFIJO} pedida ${test.info().project.name}`;
  const manana = new Date(Date.now() + 86_400_000 - 5 * 3_600_000).toISOString().slice(0, 10);

  // La empresa pide la reunión.
  const ctxEmpresa = await browser.newContext();
  const empresa = await ctxEmpresa.newPage();
  try {
    await iniciarSesion(empresa, process.env.E2E_EMPRESA_EMAIL!, process.env.E2E_EMPRESA_PASSWORD!, /\/w\/[a-z0-9-]+$/);
    const raiz = new URL(empresa.url()).pathname;
    await abrir(empresa, `${raiz}/calendario`);
    await empresa.getByRole("button", { name: /pedir una reunión/i }).click();
    const formulario = empresa.getByRole("dialog");
    await formulario.getByLabel(/de qué quieres hablar/i).fill(tema);
    await formulario.getByLabel(/^día/i).fill(manana);
    await formulario.getByLabel(/^hora/i).fill("10:00");
    await formulario.getByRole("button", { name: /enviar pedido/i }).click();
    await expect(empresa.getByRole("heading", { name: /tus reuniones pedidas/i })).toBeVisible();
    const pedido = empresa.getByRole("region", { name: /tus reuniones pedidas/i }).getByRole("listitem").filter({ hasText: tema });
    await expect(pedido.getByText("Por confirmar")).toBeVisible();

    // El propietario la confirma desde la Bandeja.
    await iniciarSesion(page);
    await abrir(page, "/panel/bandeja");
    const tarjeta = page.getByRole("listitem").filter({ hasText: tema });
    await expect(tarjeta).toBeVisible();
    await tarjeta.getByRole("button", { name: /confirmar reunión/i }).click();
    const dialogo = page.getByRole("dialog");
    await expect(dialogo.getByLabel(/^desde/i)).toHaveValue("10:00");
    await dialogo.getByLabel(/enlace de la videollamada/i).fill("https://meet.example.test/e2e");
    await dialogo.getByRole("button", { name: /confirmar y avisar/i }).click();
    await expect(dialogo, await dialogo.innerText().catch(() => "")).toBeHidden();
    // Confirmada deja de estar abierta: sale de la Bandeja (queda en "todas").
    await expect(tarjeta).toHaveCount(0);

    // La empresa la ve confirmada en su calendario.
    await empresa.reload();
    await listo(empresa);
    await expect(pedido.getByText("Confirmada", { exact: true })).toBeVisible();
    await expect(pedido.getByText("https://meet.example.test/e2e")).toBeVisible();
  } finally {
    await ctxEmpresa.close();
  }
});
