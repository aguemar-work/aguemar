import { describe, expect, it } from "vitest";
import { esSlugValido, generarSlug } from "@/lib/slug";
import { accesoEmpresaSchema, modulosSchema } from "@/lib/validators/empresa";

describe("generarSlug", () => {
  it("quita acentos, símbolos y espacios", () => {
    expect(generarSlug("BELMANGROUP S.A.C.")).toBe("belmangroup-s-a-c");
    expect(generarSlug("  Diseño & Café  ")).toBe("diseno-cafe");
    expect(generarSlug("SGC")).toBe("sgc");
  });
  it("produce slugs válidos", () => {
    expect(esSlugValido(generarSlug("Empresa Ñandú 2026"))).toBe(true);
    expect(esSlugValido("-malo")).toBe(false);
    expect(esSlugValido("Mayúsculas")).toBe(false);
  });
});

describe("validadores de empresa", () => {
  it("exige contraseña de 8 y correo válido en el acceso", () => {
    expect(accesoEmpresaSchema.safeParse({ correo: "sgc@empresa.pe", contrasena: "12345678" }).success).toBe(true);
    expect(accesoEmpresaSchema.safeParse({ correo: "sgc@empresa.pe", contrasena: "1234567" }).success).toBe(false);
    expect(accesoEmpresaSchema.safeParse({ correo: "no-correo", contrasena: "12345678" }).success).toBe(false);
  });
  it("solo acepta claves de módulo conocidas", () => {
    expect(modulosSchema.safeParse(["proyectos", "calendario"]).success).toBe(true);
    expect(modulosSchema.safeParse(["proyectos", "ventas"]).success).toBe(false);
  });
});
