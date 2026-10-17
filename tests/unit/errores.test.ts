import { describe, expect, it } from "vitest";
import { segundosDeEspera } from "@/lib/insforge/errores";

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
