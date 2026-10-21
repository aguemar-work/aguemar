import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./tests/setup-dom.ts"],
          include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
          exclude: ["tests/e2e/**", "node_modules/**", "**/*.node.test.{ts,tsx}"],
        },
      },
      {
        // Código de servidor (PDF): entorno Node, para que las librerías carguen su versión de Node.
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/unit/**/*.node.test.{ts,tsx}"],
          server: { deps: { external: [/@react-pdf/, /fontkit/, /restructure/] } },
        },
      },
    ],
  },
});
