import { describe, expect, it, vi } from "vitest";

const capturas = vi.hoisted(() => [] as unknown[]);
vi.mock("@sentry/nextjs", () => ({ captureException: (e: unknown) => capturas.push(e) }));

import { segundosDeEspera, traducirError } from "@/lib/insforge/errores";

describe("traducirError", () => {
  it("no muestra el detalle técnico de un error desconocido: lo manda a Sentry con una referencia", () => {
    const error = { code: "42P01", message: 'relation "clientes_x" does not exist' };
    const { mensaje } = traducirError(error);
    expect(mensaje).not.toContain("relation");
    expect(mensaje).not.toContain("clientes_x");
    expect(mensaje).toMatch(/referencia [0-9a-f]{6}/);
    expect(capturas).toContain(error);
  });

  it("los mensajes propios de la base siguen saliendo tal cual", () => {
    expect(traducirError({ code: "22023", message: "Nombre requerido" }).mensaje).toBe("Nombre requerido");
  });
});


describe("segundosDeEspera", () => {
  it("lee los segundos del mensaje de InsForge", () => {
    expect(
      segundosDeEspera({ message: "Please wait 41 seconds before requesting another code for this email.", statusCode: 429 }),
    ).toBe(41);
    expect(segundosDeEspera({ message: "Please wait 1 second before requesting another code" })).toBe(1);
  });

  it("usa 60 s si es 429 sin segundos en el mensaje", () => {
    expect(segundosDeEspera({ message: "Too many requests", statusCode: 429 })).toBe(60);
  });

  it("devuelve null para otros errores", () => {
    expect(segundosDeEspera({ message: "User not found", statusCode: 404 })).toBeNull();
    expect(segundosDeEspera(null)).toBeNull();
  });
});
