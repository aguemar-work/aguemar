import { describe, expect, it } from "vitest";
import { AJUSTES, itemActivo, navPara } from "@/components/panel/nav";

const rutas = (rol: "propietario" | "colaborador") => navPara(rol).flatMap((g) => g.items.map((i) => i.href));

describe("menú del panel por grupos", () => {
  it("el propietario ve Servicios dentro de Ajustes, junto a Mi marca, Plantillas y Equipo", () => {
    const ajustes = navPara("propietario").find((g) => g.titulo === "Ajustes");
    expect(ajustes?.items.map((i) => i.etiqueta)).toEqual(["Mi marca", "Servicios", "Plantillas", "Equipo"]);
    expect(ajustes?.items).toBe(AJUSTES);
  });

  it("cada ruta aparece una sola vez", () => {
    const todas = rutas("propietario");
    expect(new Set(todas).size).toBe(todas.length);
  });

  it("el colaborador no ve dinero, leads, empresas ni ajustes, y no quedan grupos vacíos", () => {
    const grupos = navPara("colaborador");
    expect(grupos.map((g) => g.titulo)).toEqual([null, "Trabajo", "Empresas"]);
    expect(rutas("colaborador")).toEqual(["/panel", "/panel/bandeja", "/panel/trabajos", "/panel/calendario", "/panel/informes", "/panel/documentos", "/panel/equipos"]);
  });

  it("marca activo solo el ítem de la ruta (Equipos no enciende Equipo)", () => {
    const equipo = AJUSTES.find((i) => i.href === "/panel/equipo")!;
    expect(itemActivo(equipo, "/panel/equipo")).toBe(true);
    expect(itemActivo(equipo, "/panel/equipos")).toBe(false);
    expect(itemActivo(equipo, "/panel/equipos/123")).toBe(false);

    const documentos = navPara("propietario").flatMap((g) => g.items).find((i) => i.href === "/panel/documentos")!;
    expect(itemActivo(documentos, "/panel/fichas/abc/editar")).toBe(true);

    const inicio = navPara("propietario")[0]!.items[0]!;
    expect(itemActivo(inicio, "/panel")).toBe(true);
    expect(itemActivo(inicio, "/panel/trabajos")).toBe(false);
  });
});
