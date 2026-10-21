import type { Page } from "@playwright/test";

/**
 * Esperas de los e2e. Contra `npm run dev` (Turbopack), la primera visita a /panel o /w
 * compila la ruta y el login con InsForge suma ida y vuelta a us-east: 5 s no alcanzan.
 */
export const ESPERA_LOGIN = 30_000;

/** Acciones que revalidan muchas rutas (publicar): en dev, la primera vez recompila varias. */
export const ESPERA_LENTA = 30_000;

/**
 * Espera a que la página termine de cargar y de hidratarse.
 * Si se interactúa antes, React restablece los <select> a su valor inicial y los enlaces
 * hacen una navegación completa en lugar de abrir el panel lateral.
 *
 * Dos señales, porque ninguna basta sola: `<html data-hidratado>` (src/components/hidratacion.tsx)
 * asegura que React ya hidrató tras una carga completa, pero queda puesta durante las navegaciones
 * internas; `networkidle` espera a que esa navegación termine de traer sus datos, pero con `next start`
 * (rápido) puede cumplirse antes de que el JavaScript se ejecute.
 */
export async function listo(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.hidratado === "1", undefined, { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
}

/** Navega a una ruta y espera a que esté lista para usarse. */
export async function abrir(page: Page, ruta: string) {
  await page.goto(ruta);
  await listo(page);
}

/**
 * Estas pruebas corren también contra `next start` (build de producción: el job `e2e` del CI y
 * `PLAYWRIGHT_WEBSERVER=1`). Cuando un test que pasa con `npm run dev` falla solo ahí, se pone en
 * cuarentena con `test.fixme(EN_PRODUCCION, MOTIVO_PANEL_NO_REFRESCA)`: sigue corriendo contra tu
 * servidor de desarrollo y no tumba el CI. El motivo queda a la vista en el informe.
 */
export const EN_PRODUCCION = process.env.PLAYWRIGHT_WEBSERVER === "1";
export const MOTIVO_PANEL_NO_REFRESCA =
  "Con `next start` la pantalla no se actualiza después de la acción del servidor, que sale con Next-Url /panel. Pasa con `npm run dev`. Hallazgo abierto del sprint 3 (docs/auditoria/98-tareas.md).";
