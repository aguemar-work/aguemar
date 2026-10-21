import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Módulos cuyas páginas empiezan con soloPropietario(): sus Server Actions son endpoints POST
 * aparte y la RLS dejaría al colaborador en un "falso éxito" (0 filas, sin error). Cada acción
 * exportada tiene que comprobar el rol ella misma (SEC-005).
 */
const SOLO_PROPIETARIO = ["clientes", "servicios", "leads", "configuracion", "cotizaciones", "equipo", "plantillas"];

function accionesSinComprobar(fuente: string): string[] {
  const partes = fuente.split(/^export async function /m).slice(1);
  return partes.filter((cuerpo) => !cuerpo.includes("await exigirPropietario()")).map((cuerpo) => cuerpo.slice(0, cuerpo.indexOf("(")));
}

describe("acciones solo del propietario", () => {
  for (const modulo of SOLO_PROPIETARIO) {
    it(`${modulo}: cada acción exportada llama a exigirPropietario()`, () => {
      const fuente = readFileSync(`src/app/panel/${modulo}/acciones.ts`, "utf8");
      expect(accionesSinComprobar(fuente)).toEqual([]);
    });
  }

  it("detecta una acción sin comprobación", () => {
    const ejemplo = "export async function a() {\n  await exigirPropietario();\n}\nexport async function b() {\n  return 1;\n}\n";
    expect(accionesSinComprobar(ejemplo)).toEqual(["b"]);
  });
});
