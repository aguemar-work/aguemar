import type { Page } from "@playwright/test";

/**
 * Esperas de los e2e. Contra `npm run dev` (Turbopack), la primera visita a /panel o /w
 * compila la ruta y el login con InsForge suma ida y vuelta a us-east: 5 s no alcanzan.
 */
export const ESPERA_LOGIN = 30_000;

/** Acciones que revalidan muchas rutas (publicar): en dev, la primera vez recompila varias. */
export const ESPERA_LENTA = 30_000;

/**
 * Espera a que la página termine de cargar su JavaScript (y por tanto de hidratarse).
 * Si se interactúa antes, React restablece los <select> a su valor inicial y los enlaces
 * hacen una navegación completa en lugar de abrir el panel lateral.
 */
export async function listo(page: Page) {
  await page.waitForLoadState("networkidle");
}

/** Navega a una ruta y espera a que esté lista para usarse. */
export async function abrir(page: Page, ruta: string) {
  await page.goto(ruta);
  await listo(page);
}
