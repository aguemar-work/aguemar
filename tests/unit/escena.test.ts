import { describe, expect, it } from "vitest";
import { FORMAS, aleatorio, esForma, generarForma, generarFormas } from "@/lib/escena/formas";
import { cantidadParticulas, estadoRecorrido, puedeAnimar, type Ancla } from "@/lib/escena/recorrido";

describe("formas de la escena 3D", () => {
  it("cada forma da n puntos finitos y dentro del encuadre", () => {
    for (const forma of FORMAS) {
      const puntos = generarForma(forma, 1500);
      expect(puntos).toHaveLength(1500 * 3);
      for (let i = 0; i < puntos.length; i += 3) {
        expect(Number.isFinite(puntos[i]) && Number.isFinite(puntos[i + 1]) && Number.isFinite(puntos[i + 2])).toBe(true);
        // La cámara ve ~±3,1 de alto; la nube de fondo es la única que se sale a propósito.
        if (forma !== "nube") expect(Math.abs(puntos[i + 1]!)).toBeLessThan(3.2);
      }
    }
  });

  it("es determinista: misma semilla, mismos puntos", () => {
    expect(Array.from(generarForma("corchetes", 200, 3))).toEqual(Array.from(generarForma("corchetes", 200, 3)));
    expect(Array.from(generarForma("corchetes", 200, 3))).not.toEqual(Array.from(generarForma("corchetes", 200, 4)));
    const r = aleatorio(1);
    const valores = Array.from({ length: 1000 }, r);
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...valores)).toBeLessThan(1);
  });

  it("los corchetes quedan a ambos lados del centro, como < >", () => {
    const puntos = generarForma("corchetes", 2000);
    let izquierda = 0;
    for (let i = 0; i < puntos.length; i += 3) if (puntos[i]! < 0) izquierda++;
    expect(izquierda / 2000).toBeGreaterThan(0.4);
    expect(izquierda / 2000).toBeLessThan(0.6);
  });

  it("genera todas las formas de una vez y reconoce sus nombres", () => {
    expect(Object.keys(generarFormas(10)).sort()).toEqual([...FORMAS].sort());
    expect(esForma("llaves")).toBe(true);
    expect(esForma("cubo")).toBe(false);
    expect(esForma(undefined)).toBe(false);
  });
});

describe("recorrido de la escena con el scroll", () => {
  const anclas: Ancla[] = [
    { centro: 500, forma: "corchetes", lado: 0.5, intensidad: 1, escala: 0.6 },
    { centro: 1500, forma: "llaves", lado: 0, intensidad: 0.4, escala: 1 },
    { centro: 2500, forma: "chip", lado: -0.5, intensidad: 1, escala: 1 },
  ];

  it("se queda en la primera y la última forma fuera del recorrido", () => {
    expect(estadoRecorrido(anclas, 0)).toMatchObject({ desde: "corchetes", hacia: "corchetes", mezcla: 0, lado: 0.5 });
    expect(estadoRecorrido(anclas, 9000)).toMatchObject({ desde: "chip", hacia: "chip", mezcla: 0, lado: -0.5 });
    expect(estadoRecorrido([], 100)).toBeNull();
  });

  it("mantiene la forma cerca de su sección y cambia en el tramo intermedio", () => {
    expect(estadoRecorrido(anclas, 700)).toMatchObject({ desde: "corchetes", hacia: "llaves", mezcla: 0 });
    const medio = estadoRecorrido(anclas, 1000)!;
    expect(medio.mezcla).toBeCloseTo(0.5);
    expect(medio.lado).toBeCloseTo(0.25);
    expect(medio.intensidad).toBeCloseTo(0.7);
    expect(estadoRecorrido(anclas, 1300)!.mezcla).toBe(1);
    expect(estadoRecorrido(anclas, 2000)).toMatchObject({ desde: "llaves", hacia: "chip" });
  });

  it("solo anima cuando conviene", () => {
    const base = { reducirMovimiento: false, webgl: true, ahorroDatos: false, nucleos: 8 };
    expect(puedeAnimar(base)).toBe(true);
    expect(puedeAnimar({ ...base, nucleos: undefined })).toBe(true);
    expect(puedeAnimar({ ...base, reducirMovimiento: true })).toBe(false);
    expect(puedeAnimar({ ...base, webgl: false })).toBe(false);
    expect(puedeAnimar({ ...base, ahorroDatos: true })).toBe(false);
    expect(puedeAnimar({ ...base, nucleos: 2 })).toBe(false);
  });

  it("usa menos partículas en celulares", () => {
    expect(cantidadParticulas(375)).toBeLessThan(cantidadParticulas(1440, 4));
    expect(cantidadParticulas(1440, 4)).toBeLessThan(cantidadParticulas(1440, 16));
  });
});
