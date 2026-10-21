import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Carga .env.local (Playwright no lo lee solo) para E2E_EMAIL / E2E_PASSWORD.
try {
  for (const linea of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // sin .env.local: los tests con sesión se omiten
}

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Un reintento basta: con más, un test inestable pasa en verde y nadie ve su traza (QA-006).
  retries: process.env.CI ? 1 : 0,
  // Quita lo que dejaron corridas anteriores (solo con cuentas de prueba .test).
  globalSetup: "./tests/e2e/global-setup.ts",
  // En local todos los workers comparten tu `npm run dev`, que compila cada ruta la primera vez:
  // con 8 a la vez se satura y los tests fallan por tiempo, no por errores.
  // En CI, un solo worker: los specs con sesión comparten la cuenta del propietario y la empresa SGC
  // (módulos, listas), y en paralelo se pisan entre sí.
  workers: process.env.CI ? 1 : 2,
  expect: { timeout: process.env.CI ? 5_000 : 15_000 },
  timeout: process.env.CI ? 30_000 : 90_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    locale: "es-PE",
    timezoneId: "America/Lima",
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil", use: { ...devices["Pixel 7"] } },
  ],
  // Por defecto no hay webServer: los tests usan el que el usuario tiene corriendo (`npm run dev`) y esta
  // configuración nunca arranca uno de desarrollo. Con PLAYWRIGHT_WEBSERVER=1 (CI, o local en otro
  // puerto: PORT=3100 PLAYWRIGHT_WEBSERVER=1) levanta `next start` sobre un build ya hecho, con las
  // mismas variables que tuvo ese build (las NEXT_PUBLIC_* se fijan al compilar).
  webServer:
    process.env.PLAYWRIGHT_WEBSERVER === "1"
      ? {
          command: `npx next start -p ${PORT}`,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "ignore",
          stderr: "pipe",
        }
      : undefined,
});
