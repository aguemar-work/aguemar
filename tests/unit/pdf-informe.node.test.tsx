import { describe, expect, it } from "vitest";
import { pdfInforme } from "@/lib/pdf/informe-pdf";
import type { InformeJson } from "@/lib/documentos";
import { guardarPdf } from "./paginas-pdf";

const informe: InformeJson = {
  id: "i1",
  numero: "INF-2026-001",
  fecha: "2026-10-01",
  area: "soporte",
  titulo: "Informe de avance · Septiembre 2026",
  periodo_inicio: "2026-09-01",
  periodo_fin: "2026-09-30",
  resumen: "En este periodo: 3 tareas completadas y 1 servicio técnico.",
  indicadores: [
    { valor: "75 %", etiqueta: "Avance del proyecto" },
    { valor: "3", etiqueta: "Tareas completadas", nota: "De 8 planificadas" },
  ],
  secciones: [
    { titulo: "Trabajo realizado", texto: "Web corporativa — en curso (6/8 tareas)\n- Maqueta\n- Contenido" },
    { titulo: "Soporte técnico", texto: "- 12/09/2026 · FT-2026-002: Mantenimiento de laptop // remoto" },
    { titulo: "Próximos pasos", texto: "Publicar la web en octubre." },
  ],
  publicado: true,
  publicado_en: null,
  trabajo: null,
  cliente: { nombre: "SGC", tipo_doc: "RUC", num_doc: "20123456789", contacto: "Ana Pérez", direccion: null },
  marca: null,
  token: null,
};

describe("PDF del informe", () => {
  it("genera el informe con y sin indicadores", async () => {
    const pdf = await pdfInforme(informe);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
    guardarPdf("informe.pdf", pdf);
    expect(Buffer.from((await pdfInforme({ ...informe, indicadores: [], resumen: null, numero: null })).slice(0, 5)).toString()).toBe("%PDF-");
  }, 30_000);
});
