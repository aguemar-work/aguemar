import { barrerHuerfanos } from "./limpieza";

/** Antes de todo: quita lo que dejaron corridas anteriores (solo con cuentas de prueba). */
export default async function globalSetup() {
  try {
    await barrerHuerfanos();
  } catch (e) {
    // Una limpieza que falla no debe impedir las pruebas.
    console.warn("[e2e] No se pudo barrer lo que dejaron corridas anteriores:", e instanceof Error ? e.message : e);
  }
}
