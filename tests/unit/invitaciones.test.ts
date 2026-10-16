import { describe, expect, it } from "vitest";
import { PERFILES_ACCESO, TOKEN_INVITACION, perfilDeModulos, whatsappInvitacion } from "@/lib/invitaciones";
import { aceptarInvitacionSchema, invitarColaboradorSchema } from "@/lib/validators/empresa";
import { CLAVES_MODULO } from "@/lib/modulos";

describe("perfiles de acceso", () => {
  it("solo usan módulos que existen", () => {
    for (const p of PERFILES_ACCESO) for (const m of p.modulos) expect(CLAVES_MODULO).toContain(m);
  });

  it("reconoce el perfil sin importar el orden", () => {
    expect(perfilDeModulos(["equipos", "documentos", "cotizaciones"])).toBe("soporte");
    expect(perfilDeModulos([...CLAVES_MODULO].reverse())).toBe("completo");
    expect(perfilDeModulos(["proyectos"])).toBeNull();
    expect(perfilDeModulos([])).toBeNull();
  });
});

describe("invitaciones", () => {
  it("valida el formato del token antes de ir a la base", () => {
    expect(TOKEN_INVITACION.test("a".repeat(43))).toBe(true);
    expect(TOKEN_INVITACION.test("corto")).toBe(false);
    expect(TOKEN_INVITACION.test("a".repeat(42) + "'")).toBe(false);
  });

  it("arma el mensaje de WhatsApp con el enlace", () => {
    const url = whatsappInvitacion("https://aguemar.com/invitacion/abc", "empresa");
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url)).toContain("https://aguemar.com/invitacion/abc");
  });

  it("exige contraseñas iguales y de 8 caracteres", () => {
    expect(aceptarInvitacionSchema.safeParse({ contrasena: "12345678", contrasena2: "12345678" }).success).toBe(true);
    expect(aceptarInvitacionSchema.safeParse({ contrasena: "1234567", contrasena2: "1234567" }).success).toBe(false);
    const distinta = aceptarInvitacionSchema.safeParse({ contrasena: "12345678", contrasena2: "87654321" });
    expect(distinta.success).toBe(false);
    expect(distinta.error?.issues[0]?.path).toEqual(["contrasena2"]);
  });

  it("un colaborador necesita al menos una empresa y el correo se normaliza", () => {
    expect(invitarColaboradorSchema.safeParse({ nombre: "Ana", correo: "a@b.pe", empresas: [] }).success).toBe(false);
    const ok = invitarColaboradorSchema.safeParse({ nombre: "Ana", correo: " Ana@Empresa.PE ", empresas: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"] });
    expect(ok.success && ok.data.correo).toBe("ana@empresa.pe");
  });
});
