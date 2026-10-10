import { describe, expect, it } from "vitest";
import { documentoSchema, esDniValido, esRucValido } from "@/lib/validators/documento";

describe("DNI", () => {
  it("acepta 8 dígitos", () => {
    expect(esDniValido("12345678")).toBe(true);
    expect(esDniValido("00000001")).toBe(true);
  });
  it("rechaza longitudes y caracteres inválidos", () => {
    expect(esDniValido("1234567")).toBe(false);
    expect(esDniValido("123456789")).toBe(false);
    expect(esDniValido("1234567a")).toBe(false);
    expect(esDniValido(" 12345678")).toBe(false);
  });
});

describe("RUC", () => {
  it("acepta RUC con dígito verificador correcto", () => {
    // RUC de SUNAT (persona jurídica pública conocida)
    expect(esRucValido("20131312955")).toBe(true);
    // RUC de persona natural
    expect(esRucValido("10123456781")).toBe(true);
  });
  it("rechaza dígito verificador incorrecto", () => {
    expect(esRucValido("20131312956")).toBe(false);
    expect(esRucValido("10123456785")).toBe(false);
  });
  it("rechaza prefijos y longitudes inválidas", () => {
    expect(esRucValido("30131312955")).toBe(false);
    expect(esRucValido("2013131295")).toBe(false);
    expect(esRucValido("201313129555")).toBe(false);
    expect(esRucValido("2013131295a")).toBe(false);
  });
});

describe("documentoSchema", () => {
  it("valida según el tipo", () => {
    expect(documentoSchema.safeParse({ tipo_doc: "DNI", num_doc: "12345678" }).success).toBe(true);
    expect(documentoSchema.safeParse({ tipo_doc: "RUC", num_doc: "12345678" }).success).toBe(false);
    expect(documentoSchema.safeParse({ tipo_doc: "RUC", num_doc: "20131312955" }).success).toBe(true);
  });
  it("devuelve un mensaje claro en num_doc", () => {
    const r = documentoSchema.safeParse({ tipo_doc: "DNI", num_doc: "123" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.path).toEqual(["num_doc"]);
      expect(r.error.issues[0]?.message).toMatch(/8 dígitos/);
    }
  });
});
