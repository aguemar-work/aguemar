/**
 * Interpreta el JSON de diagnostico-agueMar.ps1: datos del equipo, filas de
 * diagnóstico con estado sugerido e indicadores para la portada de la ficha.
 * Puro y testeable; todo lo que devuelve es editable antes de guardar.
 */
import { z } from "zod";
import type { EstadoDiagnostico } from "@/types/database";

const num = z.number().nullable().optional();
const txt = z.string().nullable().optional();
/** PowerShell serializa un arreglo de un elemento a veces como objeto suelto: lo normalizamos. */
const lista = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.array(item), item])
    .nullable()
    .optional()
    .transform((v) => (v == null ? [] : Array.isArray(v) ? v : [v]));

export const diagnosticoSchema = z.object({
  version: z.number(),
  herramienta: z.literal("diagnostico-agueMar.ps1"),
  generado: z.string(),
  es_admin: z.boolean().nullable().optional(),
  equipo: z.object({
    fabricante: txt,
    modelo: txt,
    serie: txt,
    nombre_equipo: txt,
    sistema_operativo: txt,
    version_os: txt,
    procesador: txt,
    nucleos: num,
    ram_gb: num,
    graficas: lista(z.string()),
    bios_version: txt,
    bios_fecha: txt,
  }),
  discos: lista(
    z.object({
      nombre: txt,
      tipo_medio: txt,
      bus: txt,
      tamano_gb: num,
      salud: txt,
      estado_operativo: txt,
      desgaste_pct: num,
      temperatura_c: num,
      horas_encendido: num,
      errores_lectura: num,
      errores_escritura: num,
    }),
  ),
  volumenes: lista(z.object({ letra: txt, etiqueta: txt, total_gb: num, libre_gb: num })),
  bateria: z
    .object({
      fabricante: txt,
      quimica: txt,
      nombre: txt,
      capacidad_diseno_mwh: num,
      capacidad_completa_mwh: num,
      salud_pct: num,
      ciclos: num,
    })
    .nullable()
    .optional(),
  eventos: z
    .object({
      dias: num,
      criticos: num,
      errores: num,
      recientes: lista(z.object({ fecha: txt, nivel: txt, origen: txt, id: num, mensaje: txt })),
    })
    .nullable()
    .optional(),
  seguridad: z
    .object({
      antivirus_activo: z.boolean().nullable().optional(),
      proteccion_tiempo_real: z.boolean().nullable().optional(),
      firmas_actualizadas: txt,
      firewall_activo: z.boolean().nullable().optional(),
      ultima_actualizacion: txt,
    })
    .nullable()
    .optional(),
  inicio: lista(z.object({ nombre: txt, comando: txt, ubicacion: txt })),
  avisos: lista(z.string()),
});

export type DiagnosticoJson = z.output<typeof diagnosticoSchema>;

export interface FilaDiagnostico {
  elemento: string;
  resultado: string;
  estado: EstadoDiagnostico;
}

export interface Interpretacion {
  equipo: {
    marca: string | null;
    modelo: string | null;
    serie: string | null;
    sistema_operativo: string | null;
    procesador: string | null;
    ram: string | null;
    almacenamiento: string | null;
    grafica: string | null;
    bateria: string | null;
    bios: string | null;
  };
  diagnosticos: FilaDiagnostico[];
  indicadores: { valor: string; etiqueta: string }[];
  avisos: string[];
  generado: string;
}

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
export type LecturaDiagnostico = { ok: true; datos: DiagnosticoJson } | { ok: false; error: string };

/** Acepta el texto pegado o el contenido del archivo (con o sin BOM). */
export function leerDiagnostico(texto: string): LecturaDiagnostico {
  const limpio = texto.replace(/^﻿/, "").trim();
  if (!limpio) return { ok: false, error: "Pega el contenido del JSON o sube el archivo." };
  let crudo: unknown;
  try {
    crudo = JSON.parse(limpio);
  } catch {
    return { ok: false, error: "No es un JSON válido. Copia el archivo completo que generó el script." };
  }
  const r = diagnosticoSchema.safeParse(crudo);
  if (!r.success) {
    const herramienta = (crudo as { herramienta?: unknown })?.herramienta;
    if (herramienta !== "diagnostico-agueMar.ps1") return { ok: false, error: "Este JSON no viene de diagnostico-agueMar.ps1." };
    return { ok: false, error: `El JSON del diagnóstico está incompleto (${r.error.issues[0]?.path.join(".") || "formato"}).` };
  }
  return { ok: true, datos: r.data };
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------
/** 99.7 → "99,7"; 80000 → "80 000". */
export function numeroPe(n: number, decimales = 1): string {
  const fijo = Number.isInteger(n) ? String(n) : n.toFixed(decimales).replace(/\.?0+$/, "");
  const [ent, dec] = fijo.split(".");
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec ? `${miles},${dec}` : miles;
}

const titulo = (s: string | null | undefined) => {
  const t = (s ?? "").trim();
  if (!t) return null;
  // LENOVO → Lenovo; respeta marcas con mayúsculas mixtas (HP, ASUS se quedan cortas).
  return t.length > 4 && t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
};

function fechaCorta(iso: string | null | undefined): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

const peor = (...estados: EstadoDiagnostico[]): EstadoDiagnostico =>
  estados.includes("critico") ? "critico" : estados.includes("mejorable") ? "mejorable" : "optimo";

// ---------------------------------------------------------------------------
// Interpretación
// ---------------------------------------------------------------------------
export function interpretarDiagnostico(d: DiagnosticoJson): Interpretacion {
  const e = d.equipo;
  const diagnosticos: FilaDiagnostico[] = [];
  const indicadores: Interpretacion["indicadores"] = [];
  const avisos = [...d.avisos];

  // Disco principal: el SSD (o el primero) y el resto en filas propias.
  const discos = [...d.discos].sort((a, b) => Number(b.tipo_medio === "SSD") - Number(a.tipo_medio === "SSD"));
  for (const disco of discos) {
    const partes: string[] = [];
    const estados: EstadoDiagnostico[] = [];
    const salud = (disco.salud ?? "").toLowerCase();
    if (salud) {
      partes.push(salud === "healthy" ? "salud correcta" : `salud: ${disco.salud}`);
      estados.push(salud === "healthy" ? "optimo" : salud === "warning" ? "mejorable" : "critico");
    }
    if (disco.desgaste_pct != null) {
      partes.push(`${numeroPe(disco.desgaste_pct)} % de desgaste`);
      estados.push(disco.desgaste_pct >= 50 ? "critico" : disco.desgaste_pct >= 10 ? "mejorable" : "optimo");
    }
    const erroresDisco = (disco.errores_lectura ?? 0) + (disco.errores_escritura ?? 0);
    if (disco.errores_lectura != null || disco.errores_escritura != null) {
      partes.push(erroresDisco === 0 ? "sin errores de lectura ni escritura" : `${erroresDisco} errores de lectura/escritura`);
      estados.push(erroresDisco === 0 ? "optimo" : "mejorable");
    }
    if (disco.temperatura_c != null && disco.temperatura_c > 0) {
      partes.push(`${numeroPe(disco.temperatura_c)} °C`);
      estados.push(disco.temperatura_c >= 70 ? "mejorable" : "optimo");
    }
    if (disco.horas_encendido != null) partes.push(`${numeroPe(disco.horas_encendido)} h de uso`);
    const tipo = [disco.tipo_medio && disco.tipo_medio !== "Unspecified" ? disco.tipo_medio : null, disco.bus && disco.bus !== "Unknown" ? disco.bus : null].filter(Boolean).join(" ");
    diagnosticos.push({
      elemento: `Disco ${[tipo, disco.tamano_gb ? `${numeroPe(disco.tamano_gb)} GB` : null].filter(Boolean).join(" ")}`.trim(),
      resultado: partes.length ? cap(partes.join(" · ")) : "Sin datos de salud",
      estado: estados.length ? peor(...estados) : "optimo",
    });
  }
  const principal = discos[0];
  if (principal?.desgaste_pct != null) indicadores.push({ valor: `${numeroPe(principal.desgaste_pct)} %`, etiqueta: `desgaste del ${principal.tipo_medio === "SSD" ? "SSD" : "disco"}` });
  if (principal && principal.desgaste_pct == null) {
    if (!d.es_admin && !avisos.some((a) => a.includes("administrador"))) {
      avisos.push("El desgaste del disco no se leyó: vuelve a ejecutar el script como administrador si lo necesitas.");
    } else if (d.es_admin) {
      avisos.push("Este disco no informa su desgaste; revisa su salud con la herramienta del fabricante si hace falta.");
    }
  }

  // Espacio libre por volumen
  for (const v of d.volumenes) {
    if (!v.total_gb || v.libre_gb == null) continue;
    const pct = (v.libre_gb / v.total_gb) * 100;
    diagnosticos.push({
      elemento: `Espacio libre en ${v.letra}`,
      resultado: `${numeroPe(v.libre_gb)} GB libres de ${numeroPe(v.total_gb)} GB (${numeroPe(pct, 0)} %)`,
      estado: pct < 10 ? "critico" : pct < 20 ? "mejorable" : "optimo",
    });
  }

  // Batería
  const b = d.bateria;
  if (b && b.salud_pct != null) {
    const salud = Math.min(b.salud_pct, 100);
    diagnosticos.push({
      elemento: "Batería",
      resultado: `${numeroPe(salud)} % de la capacidad de diseño${b.ciclos != null ? ` · ${numeroPe(b.ciclos)} ciclos` : ""}`,
      estado: salud < 60 ? "critico" : salud < 80 ? "mejorable" : "optimo",
    });
    indicadores.push({ valor: `${numeroPe(salud)} %`, etiqueta: b.ciclos != null ? `salud de batería · ${numeroPe(b.ciclos)} ciclos` : "salud de batería" });
  }

  // Eventos
  if (d.eventos) {
    const criticos = d.eventos.criticos ?? 0;
    const errores = d.eventos.errores ?? 0;
    diagnosticos.push({
      elemento: `Eventos del sistema (${d.eventos.dias ?? 7} días)`,
      resultado: `${criticos} ${criticos === 1 ? "evento crítico" : "eventos críticos"} y ${errores} ${errores === 1 ? "error" : "errores"}`,
      estado: criticos > 5 ? "critico" : criticos > 0 || errores > 50 ? "mejorable" : "optimo",
    });
    indicadores.push({ valor: String(criticos), etiqueta: `eventos críticos en ${d.eventos.dias ?? 7} días` });
  }

  // Seguridad
  const s = d.seguridad;
  if (s && (s.antivirus_activo != null || s.firewall_activo != null)) {
    const ok = s.antivirus_activo !== false && s.proteccion_tiempo_real !== false && s.firewall_activo !== false;
    const partes = [
      s.antivirus_activo == null ? null : s.antivirus_activo ? "antivirus activo" : "antivirus desactivado",
      s.proteccion_tiempo_real === false ? "sin protección en tiempo real" : null,
      s.firmas_actualizadas ? `firmas del ${fechaCorta(s.firmas_actualizadas)}` : null,
      s.firewall_activo == null ? null : s.firewall_activo ? "firewall activo" : "firewall desactivado",
    ].filter(Boolean);
    diagnosticos.push({ elemento: "Antivirus y firewall", resultado: cap(partes.join(" · ")), estado: ok ? "optimo" : "critico" });
  }
  if (s?.ultima_actualizacion) {
    diagnosticos.push({ elemento: "Windows Update", resultado: `Última actualización instalada el ${fechaCorta(s.ultima_actualizacion)}`, estado: "optimo" });
  }

  // Programas de inicio
  if (d.inicio.length) {
    diagnosticos.push({
      elemento: "Programas de inicio",
      resultado: `${d.inicio.length} programas se abren al encender`,
      estado: d.inicio.length > 15 ? "mejorable" : "optimo",
    });
  }

  // BIOS
  if (e.bios_version) {
    diagnosticos.push({ elemento: "BIOS", resultado: [e.bios_version, fechaCorta(e.bios_fecha) ? `del ${fechaCorta(e.bios_fecha)}` : null].filter(Boolean).join(" "), estado: "optimo" });
  }

  // Equipo
  const almacenamiento = d.discos
    .map((x) => [x.tipo_medio && x.tipo_medio !== "Unspecified" ? x.tipo_medio : null, x.nombre, x.tamano_gb ? `${numeroPe(x.tamano_gb)} GB` : null].filter(Boolean).join(" "))
    .join(" + ");
  const equipo: Interpretacion["equipo"] = {
    marca: titulo(e.fabricante),
    modelo: e.modelo?.trim() || null,
    serie: e.serie?.trim() || null,
    sistema_operativo: [e.sistema_operativo?.replace(/^Microsoft\s+/i, ""), e.version_os].filter(Boolean).join(" ") || null,
    procesador: e.procesador?.trim() || null,
    ram: e.ram_gb ? `${numeroPe(e.ram_gb)} GB` : null,
    almacenamiento: almacenamiento || null,
    grafica: e.graficas.length ? e.graficas.join(" + ") : null,
    bateria: b ? [b.fabricante, b.quimica, b.capacidad_diseno_mwh ? `${numeroPe(b.capacidad_diseno_mwh)} mWh` : null].filter(Boolean).join(" ") || null : null,
    bios: e.bios_version ? `${e.bios_version}${fechaCorta(e.bios_fecha) ? ` (${fechaCorta(e.bios_fecha)})` : ""}` : null,
  };

  return { equipo, diagnosticos, indicadores: indicadores.slice(0, 4), avisos, generado: d.generado };
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
