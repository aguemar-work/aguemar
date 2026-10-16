import { describe, expect, it } from "vitest";
import { filtroOr, patronBusqueda } from "@/lib/datos/busqueda";
import { ipDe } from "@/lib/ip";

describe("patronBusqueda", () => {
  it("deja pasar texto normal, con tildes y ñ", () => {
    expect(patronBusqueda("Ñandú Pérez")).toBe("Ñandú Pérez");
  });

  it("quita lo que rompe la sintaxis del filtro de PostgREST", () => {
    expect(patronBusqueda("Ñandú, S.A.C. (Lima)")).toBe("Ñandú S.A.C. Lima");
    expect(patronBusqueda("a%b_c\\d\"e'f*g")).toBe("a b c d e f g");
  });

  it("normaliza espacios y acorta", () => {
    expect(patronBusqueda("   hola    mundo  ")).toBe("hola mundo");
    expect(patronBusqueda("x".repeat(200))).toHaveLength(80);
    expect(patronBusqueda(null)).toBe("");
    expect(patronBusqueda(undefined)).toBe("");
  });
});

describe("filtroOr", () => {
  it("arma el filtro para varios campos", () => {
    expect(filtroOr("sgc", ["nombre", "num_doc"])).toBe("nombre.ilike.%sgc%,num_doc.ilike.%sgc%");
  });

  it("sin texto útil deja un patrón que no filtra", () => {
    expect(filtroOr("", ["nombre"])).toBe("nombre.ilike.%%");
    expect(filtroOr(",,()", ["nombre"])).toBe("nombre.ilike.%%");
  });
});

describe("ipDe", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    expect(ipDe(new Headers({ "x-forwarded-for": "190.42.1.10, 10.0.0.1" }))).toBe("190.42.1.10");
  });

  it("usa x-real-ip como respaldo y admite IPv6", () => {
    expect(ipDe(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("descarta valores que no son IP", () => {
    expect(ipDe(new Headers({ "x-forwarded-for": "no-es-ip" }))).toBeNull();
    expect(ipDe(new Headers())).toBeNull();
  });
});
