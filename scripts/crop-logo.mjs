#!/usr/bin/env node
/**
 * Genera public/logo.svg y public/logo-light.svg a partir de LOGO.svg (CorelDRAW, lienzo A4).
 *
 * - Recorta el viewBox a "4470 12270 12720 5835" (el logo centrado en el lienzo).
 * - Convierte las clases CSS internas (<style> .fil0 { fill:#0A0F1A }) en atributos fill/stroke en línea.
 * - Quita width/height fijos para que el SVG escale.
 * - logo-light.svg reemplaza #0A0F1A por #FFFFFF para fondos oscuros.
 *
 * Uso: node scripts/crop-logo.mjs [ruta/LOGO.svg]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const VIEWBOX = "4470 12270 12720 5835";
const INK = "#0A0F1A";
const origen = resolve(process.argv[2] ?? "LOGO.svg");

if (!existsSync(origen)) {
  console.error(`No se encontró ${origen}. Copia LOGO.svg a la raíz del proyecto y vuelve a ejecutar.`);
  process.exit(1);
}

let svg = readFileSync(origen, "utf8");

// 1. Extraer reglas CSS internas: .fil0 {fill:#0A0F1A} / .str0 {stroke:#...; stroke-width:...}
const reglas = new Map();
svg = svg.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
  const limpio = css.replace(/<!\[CDATA\[|\]\]>/g, "");
  for (const m of limpio.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
    const [, clase, cuerpo] = m;
    const props = {};
    for (const decl of cuerpo.split(";")) {
      const [k, v] = decl.split(":").map((s) => s?.trim());
      if (k && v) props[k] = v;
    }
    reglas.set(clase, { ...(reglas.get(clase) ?? {}), ...props });
  }
  return "";
});

// 2. Aplicar las reglas como atributos en línea.
svg = svg.replace(/<([a-zA-Z]+)([^>]*?)\sclass="([^"]+)"([^>]*?)(\/?)>/g, (_, tag, antes, clases, despues, cierre) => {
  const atributos = {};
  for (const clase of clases.split(/\s+/)) {
    Object.assign(atributos, reglas.get(clase) ?? {});
  }
  const extra = Object.entries(atributos)
    .filter(([k]) => ["fill", "stroke", "stroke-width", "fill-rule", "stroke-linejoin", "stroke-linecap", "opacity", "fill-opacity"].includes(k))
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<${tag}${antes}${extra ? " " + extra : ""}${despues}${cierre}>`;
});

// 3. Normalizar la etiqueta raíz: viewBox recortado, sin width/height fijos.
svg = svg.replace(/<svg\b([^>]*)>/i, (_, attrs) => {
  let a = attrs
    .replace(/\sviewBox="[^"]*"/i, "")
    .replace(/\swidth="[^"]*"/i, "")
    .replace(/\sheight="[^"]*"/i, "")
    .replace(/\sstyle="[^"]*"/i, "");
  if (!/xmlns=/.test(a)) a += ' xmlns="http://www.w3.org/2000/svg"';
  return `<svg${a} viewBox="${VIEWBOX}" role="img" aria-label="agueMar">`;
});

// 4. Quitar comentarios y metadatos de CorelDRAW.
svg = svg
  .replace(/<\?xml[^>]*\?>\s*/g, "")
  .replace(/<!DOCTYPE[^>]*>\s*/gi, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
  .replace(/<defs>\s*<\/defs>/gi, "")
  .replace(/\n\s*\n/g, "\n")
  .trim();

const claro = svg.replace(new RegExp(INK, "gi"), "#FFFFFF");

mkdirSync("public", { recursive: true });
writeFileSync("public/logo.svg", svg + "\n");
writeFileSync("public/logo-light.svg", claro + "\n");

const coloresOscuro = [...new Set(svg.match(/#[0-9a-fA-F]{6}/g) ?? [])];
console.log(`✔ public/logo.svg y public/logo-light.svg generados (viewBox ${VIEWBOX}).`);
console.log(`  Colores encontrados: ${coloresOscuro.join(", ") || "ninguno (revisa el SVG)"}`);
if (!coloresOscuro.some((c) => c.toUpperCase() === INK)) {
  console.warn(`  Aviso: no se encontró ${INK} en el SVG; logo-light.svg puede necesitar ajuste manual.`);
}
