import { describe, expect, it } from "vitest";
import { pdfActa, pdfBrief } from "@/lib/pdf/brief-acta-pdf";
import { lineas, type ActaJson, type BriefJson } from "@/lib/documentos";
import { guardarPdf } from "./paginas-pdf";

const cliente = { nombre: "SGC", tipo_doc: "RUC", num_doc: "20123456789", contacto: "Ana Pérez", direccion: null };

const brief: BriefJson = {
  id: "b1",
  numero: "BR-2026-001",
  fecha: "2026-10-15",
  area: "diseno",
  titulo: "Rediseño de la web corporativa",
  objetivo: "Recibir más consultas por WhatsApp desde la web.",
  contexto: "La web actual es de 2019 y no se ve bien en celular.",
  publico: "Empresas de Lima que buscan servicios de construcción.",
  alcance: "Diseño de 5 secciones\n- Versión para celular\n• Formulario de contacto",
  fuera_alcance: "Redacción de textos",
  entregables: "Web publicada\nManual de uso",
  referencias: "https://ejemplo.com — por la claridad del menú",
  fecha_entrega: "2026-11-15",
  publicado: true,
  publicado_en: null,
  trabajo: "Web corporativa",
  cliente,
  marca: null,
  token: null,
};

const acta: ActaJson = {
  id: "a1",
  numero: "AE-2026-001",
  fecha: "2026-11-15",
  area: "desarrollo",
  titulo: "Entrega de la web corporativa",
  resumen: "Se entrega la web publicada y su manual.",
  entregables: [
    { nombre: "Web publicada", detalle: "En el dominio de la empresa", url: "https://sgc.com.pe" },
    { nombre: "Manual de uso", detalle: null, url: null },
  ],
  observaciones: "Garantía de 30 días por errores.",
  publicada: true,
  publicada_en: null,
  aceptacion: { nombre: "Ana Pérez", dni: "12345678", aceptado_en: "2026-11-16T15:00:00Z" },
  trabajo: "Web corporativa",
  cliente,
  marca: null,
  token: null,
};

describe("PDF de brief y acta", () => {
  it("genera el brief", async () => {
    const pdf = await pdfBrief(brief);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    guardarPdf("brief.pdf", pdf);
  }, 30_000);
  it("genera el acta, aceptada y por aceptar", async () => {
    const pdfDelActa = await pdfActa(acta);
    expect(Buffer.from(pdfDelActa.slice(0, 5)).toString()).toBe("%PDF-");
    guardarPdf("acta.pdf", pdfDelActa);
    expect(Buffer.from((await pdfActa({ ...acta, aceptacion: null, observaciones: null })).slice(0, 5)).toString()).toBe("%PDF-");
  }, 30_000);
});

describe("lineas", () => {
  it("parte por líneas, quita viñetas y vacíos", () => {
    expect(lineas("Uno\n- Dos\r\n\n• Tres\n  * Cuatro  ")).toEqual(["Uno", "Dos", "Tres", "Cuatro"]);
    expect(lineas(null)).toEqual([]);
  });
});
