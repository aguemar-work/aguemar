import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pdfFicha } from "@/lib/pdf/ficha-pdf";
import { interpretarDiagnostico, leerDiagnostico } from "@/lib/diagnostico";
import type { FichaJson } from "@/lib/documentos";
import { guardarPdf, paginasPdf } from "./paginas-pdf";

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

/** Ficha completa como la FT-2026-001 del seed: 8 diagnósticos, 12 trabajos, 3 incidencias, 4 recomendaciones. */
function fichaCompleta(): FichaJson {
  const base = fichaDeEjemplo();
  const trabajos = ["Respaldo", "Integridad", "Limpieza", "Optimización", "Aplicaciones", "Windows Update", "Programas", "Antivirus óptimo", "Firewall", "Eventos del sistema", "Idioma y teclado", "Soporte del fabricante"];
  return {
    ...base,
    numero: "FT-2026-001",
    resumen: "Equipo en óptimas condiciones: SSD sin desgaste, batería al 99,7 % y sin errores de integridad. Se atendieron las 3 incidencias reportadas.",
    diagnosticos: [
      { elemento: "Integridad del sistema (DISM, SFC, CHKDSK)", resultado: "0 errores detectados", estado: "optimo" },
      { elemento: "Disco SSD Samsung 1 TB", resultado: "0 % de desgaste, sin sectores reasignados", estado: "optimo" },
      { elemento: "Batería BYD Li-Po", resultado: "99,7 % de capacidad, 392 ciclos", estado: "optimo" },
      { elemento: "BIOS", resultado: "RLCN29WW del 14/08/2025, versión vigente", estado: "optimo" },
      { elemento: "Eventos críticos (7 días)", resultado: "Sin eventos críticos relevantes", estado: "optimo" },
      { elemento: "Microsoft Store / WhatsApp", resultado: "Error 0x80073D02 al actualizar", estado: "atendido" },
      { elemento: "Microsoft Office", resultado: "Imágenes no se mostraban en documentos", estado: "atendido" },
      { elemento: "Nitro PDF", resultado: "No aceptaba contraseñas", estado: "atendido" },
    ],
    trabajos: trabajos.map((titulo) => ({ titulo, detalle: "Revisión y ajuste según la plantilla de mantenimiento preventivo.", hecho: true })),
    incidencias: [
      { titulo: "Error 0x80073D02 al actualizar WhatsApp", causa: "WhatsApp Beta estaba en uso durante la actualización desde Microsoft Store.", solucion: "Se cerró la aplicación, se reinició el servicio de Store y se completó la actualización.", estado: "resuelta" },
      { titulo: "Imágenes no se mostraban en Office", causa: "Opción de visualización de marcadores de posición activa y caché gráfica de Office dañada.", solucion: "Se desactivó la opción, se limpió la caché y se verificó la visualización en Word y Excel.", estado: "resuelta" },
      { titulo: "Nitro PDF no aceptaba contraseñas", causa: "La captura de teclado de la sesión remota interfería con el campo de contraseña.", solucion: "Se indicó ingresar la contraseña localmente y se validó la apertura del documento.", estado: "resuelta" },
    ],
    recomendaciones: [
      "Mantener Windows Update activo y reiniciar el equipo al menos una vez por semana.",
      "Usar la versión estable de WhatsApp en lugar de la Beta para evitar errores de actualización.",
      "Programar el siguiente mantenimiento preventivo en 6 meses (abril de 2027).",
      "Conservar entre 20 % y 80 % de carga para prolongar la vida útil de la batería.",
    ],
    marca: {
      nombre_comercial: "aguemar",
      responsable: "Alejandro Guevara Martínez",
      cargo: "Diseño, desarrollo y soporte técnico",
      ruc: null,
      telefono: "+51 999 999 999",
      correo: "hola@aguemar.com",
      web: "aguemar.com",
      direccion: null,
      pago_cuenta: null,
      pago_cci: null,
      pago_yape: null,
      pago_plin: null,
    },
  };
}

describe("PDF de ficha técnica", () => {
  it("una ficha completa cabe en una sola página", async () => {
    const pdf = await pdfFicha(fichaCompleta(), "https://aguemar.com/d/token-de-prueba-0123456789abcdef");
    guardarPdf("ficha.pdf", pdf);
    expect(paginasPdf(pdf)).toBe(1);
  }, 30_000);

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
