import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pdfCotizacion, type DatosCotizacionPdf } from "@/lib/pdf/cotizacion-pdf";

const ejemplo: DatosCotizacionPdf = {
  numero: "COT-2026-001",
  fecha: "2026-10-14",
  vence: "2026-10-29",
  asunto: "Página web corporativa",
  area: "desarrollo",
  estado: "enviada",
  moneda: "PEN",
  igv_pct: 1800,
  igv_modo: "sumar",
  subtotal: 232333,
  igv: 41820,
  total: 274153,
  condiciones: "50 % de adelanto y 50 % a la entrega.\nIncluye dos rondas de cambios.",
  items: [
    { descripcion: "Diseño y desarrollo del sitio\nHasta 5 secciones, responsivo, con panel de contenidos.", unidad: "proyecto", cantidad: 1, precio_unitario: 150000, descuento: 0, importe: 150000 },
    { descripcion: "Hosting y dominio", unidad: "año", cantidad: "2.500", precio_unitario: 33333, descuento: 1000, importe: 82333 },
  ],
  aceptacion: null,
  cliente: { nombre: "SGC", tipo_doc: "RUC", num_doc: "20123456789", contacto: "Ana Pérez", direccion: "Lima" },
  marca: {
    nombre_comercial: "aguemar",
    responsable: "Alejandro Guevara Martínez",
    cargo: "Diseño, desarrollo y soporte técnico",
    ruc: null,
    telefono: "+51 999 999 999",
    correo: "hola@aguemar.com",
    web: "aguemar.com",
    direccion: null,
    pago_cuenta: "BCP 191-00000000-0-00",
    pago_cci: null,
    pago_yape: "999 999 999",
    pago_plin: null,
  },
};

describe("PDF de cotización", () => {
  it("genera un PDF válido con las fuentes y el logo de la marca", async () => {
    const pdf = await pdfCotizacion(ejemplo);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(10_000);
    if (process.env.GUARDAR_PDF) {
      mkdirSync(path.dirname(process.env.GUARDAR_PDF), { recursive: true });
      writeFileSync(process.env.GUARDAR_PDF, pdf);
    }
  }, 30_000);
});
