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
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
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
  // Sin webServer: los tests usan el servidor que el usuario tiene corriendo en su máquina (npm run dev).
});
