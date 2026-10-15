import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pdfFicha } from "@/lib/pdf/ficha-pdf";
import { interpretarDiagnostico, leerDiagnostico } from "@/lib/diagnostico";
import type { FichaJson } from "@/lib/documentos";

/** Ficha armada desde el diagnóstico de ejemplo, como quedaría tras importarlo. */
function fichaDeEjemplo(): FichaJson {
  const r = leerDiagnostico(readFileSync(path.join(__dirname, "..", "fixtures", "diagnostico-ejemplo.json"), "utf8"));
  if (!r.ok) throw new Error(r.error);
  const i = interpretarDiagnostico(r.datos);
  return {
    id: "ficha-prueba",
    numero: "FT-2026-002",
    fecha: "2026-10-09",
    tipo_servicio: "Mantenimiento preventivo",
    modalidad: "remota",
    titular: "Mantenimiento preventivo remoto · Lenovo IdeaPad Pro 5",
    resumen: "Equipo en óptimas condiciones. Se atendieron las incidencias reportadas.",
    estado_final: "operativo",
    indicadores: i.indicadores,
    proximo_mantenimiento: "2027-04-09",
    publicada: true,
    publicada_en: "2026-10-09T15:00:00Z",
    equipo: { ...i.equipo, serie: i.equipo.serie ?? "SIN-SERIE" },
    diagnosticos: i.diagnosticos,
    trabajos: [
      { titulo: "Respaldo", detalle: "Copia de seguridad antes de intervenir.", hecho: true },
      { titulo: "Integridad", detalle: "DISM, SFC y CHKDSK sin errores.", hecho: true },
      { titulo: "Limpieza", detalle: null, hecho: false },
    ],
    incidencias: [{ titulo: "Error 0x80073D02 al actualizar WhatsApp", causa: "La app estaba en uso.", solucion: "Se cerró y se completó la actualización.", estado: "resuelta" }],
    recomendaciones: ["Mantener Windows Update activo.", "Programar el siguiente mantenimiento en 6 meses."],
    cliente: { nombre: "SGC", tipo_doc: "RUC", num_doc: "20123456789", contacto: "Ana Pérez", direccion: null },
    marca: null,
    token: "token-de-prueba-0123456789abcdef",
  };
}

describe("PDF de ficha técnica", () => {
  it("genera un PDF válido con QR cuando hay enlace", async () => {
    const pdf = await pdfFicha(fichaDeEjemplo(), "https://aguemar.com/d/token-de-prueba-0123456789abcdef");
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
  }, 30_000);

  it("funciona sin enlace (borrador, sin QR) y sin secciones opcionales", async () => {
    const f = { ...fichaDeEjemplo(), publicada: false, token: null, indicadores: [], incidencias: [], recomendaciones: [], equipo: null };
    const pdf = await pdfFicha(f, null);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  }, 30_000);
});
