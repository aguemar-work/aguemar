import { describe, expect, it } from "vitest";
import { enlaceWhatsApp, numeroWhatsApp, serviciosPorArea, telefonoLegible, textoPrecio, type ServicioLanding } from "@/lib/landing";
import { leadSchema, mensajeLead } from "@/lib/validators/lead";
import { TEXTOS } from "@/lib/landing-textos";

describe("utilidades de la landing", () => {
  it("normaliza números para WhatsApp", () => {
    expect(numeroWhatsApp("924 262 338")).toBe("51924262338");
    expect(numeroWhatsApp("+51 924-262-338")).toBe("51924262338");
    // Fijo de Lima (9 dígitos, no empieza con 9): no es WhatsApp.
    expect(numeroWhatsApp("01 234 5678")).toBeNull();
    expect(numeroWhatsApp("")).toBeNull();
    expect(enlaceWhatsApp("924262338", "Hola, ¿qué tal?")).toBe("https://wa.me/51924262338?text=Hola%2C%20%C2%BFqu%C3%A9%20tal%3F");
    expect(telefonoLegible("924262338")).toBe("924 262 338");
    expect(telefonoLegible("+51924262338")).toBe("+51 924 262 338");
    expect(numeroWhatsApp("+51924262338")).toBe("51924262338");
  });

  it("agrupa servicios por área y arma el precio", () => {
    const s = (nombre: string, area: ServicioLanding["area"], precio_base: number | null = null): ServicioLanding => ({ id: nombre, nombre, descripcion: null, area, precio_base, unidad: "equipo" });
    const g = serviciosPorArea([s("Logo", "diseno"), s("Web", "desarrollo"), s("Mantenimiento", "soporte", 8000)]);
    expect(g.diseno.map((x) => x.nombre)).toEqual(["Logo"]);
    expect(g.soporte).toHaveLength(1);
    expect(textoPrecio(g.soporte[0])).toBe("Desde S/ 80,00 por equipo");
    expect(textoPrecio(g.diseno[0])).toBeNull();
  });
});

describe("formulario de contacto", () => {
  const base = { nombre: "Ana Pérez", empresa: "", telefono: "924262338", correo: "", interes: "", mensaje: "Necesito una web para mi empresa.", sitio_web: "" };

  it("acepta WhatsApp o correo y normaliza", () => {
    const r = leadSchema.parse({ ...base, correo: "Ana@Empresa.PE", empresa: "Constructora Sol" });
    expect(r.correo).toBe("ana@empresa.pe");
    expect(mensajeLead(r)).toBe("Empresa: Constructora Sol\n\nNecesito una web para mi empresa.");
    expect(mensajeLead(leadSchema.parse(base))).toBe("Necesito una web para mi empresa.");
  });

  it("pide un medio de contacto, un mensaje útil y rechaza bots", () => {
    const sinContacto = leadSchema.safeParse({ ...base, telefono: "" });
    expect(sinContacto.success).toBe(false);
    expect(sinContacto.error?.issues[0].path).toEqual(["telefono"]);
    expect(leadSchema.safeParse({ ...base, mensaje: "hola" }).success).toBe(false);
    expect(leadSchema.safeParse({ ...base, correo: "no-es-correo" }).success).toBe(false);
    const bot = leadSchema.safeParse({ ...base, sitio_web: "http://spam.example" });
    expect(bot.success).toBe(false);
    expect(bot.error?.issues[0].path).toEqual(["sitio_web"]);
  });
});

describe("metadatos y datos estructurados de la landing", () => {
  it("las dos versiones llevan imagen para compartir", async () => {
    const { metadataLanding } = await import("@/lib/landing-meta");
    for (const idioma of ["es", "en"] as const) {
      const m = metadataLanding(idioma);
      expect(m.openGraph?.images).toBeTruthy();
      expect(m.twitter?.images).toBeTruthy();
    }
  });

  it("el JSON-LD no publica datos personales del responsable", async () => {
    const { jsonLdLanding } = await import("@/lib/landing-meta");
    const marca = {
      nombre_comercial: "aguemar", responsable: "Nombre Completo Del Responsable", cargo: "Gerente",
      ruc: null, telefono: "924262338", correo: "persona@gmail.com", web: null, direccion: null,
    };
    const ld = jsonLdLanding({ idioma: "en", sitio: "https://aguemar.com", marca, servicios: [], telefono: marca.telefono });
    const texto = JSON.stringify(ld);
    expect(texto).not.toContain("Nombre Completo Del Responsable");
    expect(texto).not.toContain("gmail.com");
    expect(ld).not.toHaveProperty("inLanguage");
    expect(ld).not.toHaveProperty("founder");
    expect(ld.url).toBe("https://aguemar.com/en");
    expect(ld.telephone).toBe("+51924262338");
    const conDominio = jsonLdLanding({ idioma: "es", sitio: "https://aguemar.com", marca: { ...marca, correo: "hola@aguemar.com" }, servicios: [], telefono: null });
    expect(conDominio.email).toBe("hola@aguemar.com");
    expect(conDominio.url).toBe("https://aguemar.com");
  });
});

describe("robots.txt", () => {
  it("bloquea lo privado y deja rastrear /d/ y /login para que Google lea su noindex", async () => {
    const { default: robots } = await import("@/app/robots");
    const reglas = robots().rules;
    const disallow = (Array.isArray(reglas) ? reglas[0] : reglas).disallow;
    expect(disallow).toEqual(expect.arrayContaining(["/panel", "/w/", "/api/"]));
    expect(disallow).not.toContain("/d/");
    expect(disallow).not.toContain("/login");
  });
});

describe("títulos de la landing", () => {
  it("caben en un resultado de búsqueda (60 caracteres) y nombran el lugar", () => {
    for (const idioma of ["es", "en"] as const) {
      const titulo = TEXTOS[idioma].meta.titulo;
      expect(titulo.length).toBeLessThanOrEqual(60);
      expect(titulo).toMatch(/Per[úu]/);
    }
  });
});
