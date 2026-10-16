"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, FileText, KeyRound, Lock, QrCode, ShieldCheck, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Lo que he construido": proyectos propios y para clientes, contados de forma general
 * (sin nombres de clientes). Las maquetas son ilustrativas, con datos ficticios.
 */

interface Proyecto {
  clave: string;
  titulo: string;
  areas: string[];
  reto: string;
  hecho: string[];
  stack: string[];
  maqueta: () => ReactNode;
}

function Marco({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320]/95 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-mint/80" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-white/45">{url}</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

const Linea = ({ ancho, className }: { ancho: string; className?: string }) => <span className={cn("block h-2 rounded-full bg-white/10", className)} style={{ width: ancho }} />;

const PROYECTOS: Proyecto[] = [
  {
    clave: "web",
    titulo: "Rediseño y optimización de una web corporativa",
    areas: ["diseño", "desarrollo"],
    reto: "Una web que tardaba en mostrarse: librerías externas, íconos y animaciones que bloqueaban la carga.",
    hecho: [
      "Quité tres recursos externos que frenaban la página antes de pintarse.",
      "Cambié las animaciones a CSS nativo: de 14 KB de JavaScript a menos de 1 KB.",
      "Íconos en SVG, imagen principal prioritaria y títulos pensados para Google.",
    ],
    stack: ["Astro", "CSS", "SEO"],
    maqueta: () => (
      <Marco url="empresa.com.pe">
        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2.5 rounded-xl bg-white/[0.04] p-4">
            <Linea ancho="40%" className="bg-mint/50" />
            <Linea ancho="90%" className="h-4 bg-white/20" />
            <Linea ancho="70%" className="h-4 bg-white/20" />
            <Linea ancho="85%" />
            <Linea ancho="60%" />
            <span className="mt-2 inline-block h-6 w-24 rounded-md bg-mint/70" />
          </div>
          <ul className="space-y-2 font-mono text-[11px]">
            {[
              ["peticiones que bloqueaban", "−3"],
              ["JavaScript de animaciones", "−14 KB"],
              ["CSS de íconos externos", "−30 KB"],
            ].map(([texto, valor]) => (
              <li key={texto} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2">
                <span className="text-white/50">{texto}</span>
                <span className="whitespace-nowrap text-mint">{valor}</span>
              </li>
            ))}
          </ul>
        </div>
      </Marco>
    ),
  },
  {
    clave: "itms",
    titulo: "Sistema ITMS para un área de TI",
    areas: ["desarrollo", "soporte"],
    reto: "Los accesos de cada trabajador (correo, VPN, ERP…) estaban repartidos y nadie sabía quién tuvo qué, ni desde cuándo.",
    hecho: [
      "Historial de asignaciones: quién tuvo cada acceso, desde cuándo y si la contraseña se cambió después.",
      "Contraseñas cifradas en el servidor y entregas por enlace de un solo uso.",
      "Mesa de ayuda propia con tickets y encuestas, más el inventario de equipos con fotos.",
    ],
    stack: ["Vue 3", "Postgres + RLS", "Funciones en el servidor"],
    maqueta: () => (
      <Marco url="ti.empresa.pe/empleados">
        <ul className="text-sm">
          {[
            { nombre: "Ana R.", accesos: ["Correo", "VPN", "ERP"] },
            { nombre: "Luis M.", accesos: ["Correo", "ERP"] },
            { nombre: "Carla P.", accesos: ["Correo", "VPN"] },
          ].map((e) => (
            <li key={e.nombre} className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2.5 last:border-0">
              <span>{e.nombre}</span>
              <span className="flex flex-wrap justify-end gap-1">
                {e.accesos.map((a) => (
                  <span key={a} className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[10px] text-white/60">
                    {a}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl bg-mint/10 p-3">
            <KeyRound className="size-5 shrink-0 text-mint" aria-hidden />
            <div>
              <p className="text-sm">Entrega de credencial</p>
              <p className="font-mono text-[11px] text-white/50">enlace de un solo uso</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <Ticket className="size-5 shrink-0 text-white/60" aria-hidden />
            <div>
              <p className="text-sm">Ticket · impresora</p>
              <p className="font-mono text-[11px] text-[#f2c35b]">en atención</p>
            </div>
          </div>
        </div>
      </Marco>
    ),
  },
  {
    clave: "agenda",
    titulo: "Agenda y tareas para equipos de TI",
    areas: ["desarrollo"],
    reto: "Planificar la semana de un equipo, registrar los imprevistos del día y medir lo que de verdad se cumple.",
    hecho: [
      "“Mi semana”: grilla de lunes a sábado con tareas, incidencias y bitácora.",
      "Órdenes de trabajo con aprobación: borrador, pendiente, aprobada y completada.",
      "Objetivos con avance, métricas para el jefe y varias organizaciones aisladas en la base de datos.",
    ],
    stack: ["React 19", "Postgres + RLS", "Multiorganización"],
    maqueta: () => (
      <Marco url="agenda.equipo.pe/mi-semana">
        <div className="grid grid-cols-6 gap-1.5 text-center font-mono text-[10px] text-white/40">
          {["lun", "mar", "mié", "jue", "vie", "sáb"].map((d) => (
            <span key={d}>{d}</span>
          ))}
          {[
            [2, 1, 0],
            [1, 2, 1],
            [3, 0, 0],
            [1, 1, 2],
            [2, 0, 1],
            [0, 1, 0],
          ].map((dia, i) => (
            <div key={i} className="flex min-h-[120px] flex-col gap-1.5 rounded-lg bg-white/[0.03] p-1.5">
              {Array.from({ length: dia[0]! }, (_, j) => (
                <span key={`h${j}`} className="flex h-5 items-center justify-center rounded bg-mint/25">
                  <Check className="size-3 text-mint" aria-hidden />
                </span>
              ))}
              {Array.from({ length: dia[1]! }, (_, j) => (
                <span key={`p${j}`} className="h-5 rounded bg-white/10" />
              ))}
              {Array.from({ length: dia[2]! }, (_, j) => (
                <span key={`i${j}`} className="h-5 rounded border border-dashed border-[#f2c35b]/50" />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-white/50">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-mint/60" /> hecha
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-white/20" /> pendiente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-sm border border-dashed border-[#f2c35b]" /> imprevisto
            </span>
          </span>
          <span className="text-mint">OT · aprobada</span>
        </div>
      </Marco>
    ),
  },
  {
    clave: "verifica",
    titulo: "Emisión y verificación de documentos con QR",
    areas: ["desarrollo"],
    reto: "Documentos que se podían copiar o alterar sin que quien los recibía pudiera comprobarlo.",
    hecho: [
      "El sistema emite el documento en Word, listo para imprimir o firmar.",
      "Cada documento lleva un código QR propio.",
      "Quien lo recibe lo escanea con el celular y ve si es auténtico.",
    ],
    stack: ["React", "Supabase", "Word (docx)"],
    maqueta: () => (
      <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl bg-white p-4 text-ink shadow-2xl shadow-black/40 sm:-rotate-2">
          <div className="flex items-center justify-between">
            <FileText className="size-5 text-muted" aria-hidden />
            <span className="font-mono text-[10px] text-muted">DOC-0000-000</span>
          </div>
          <div className="mt-3 space-y-2">
            <span className="block h-2.5 w-3/4 rounded-full bg-ink/80" />
            <span className="block h-2 w-full rounded-full bg-line" />
            <span className="block h-2 w-11/12 rounded-full bg-line" />
            <span className="block h-2 w-4/5 rounded-full bg-line" />
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="block h-px w-24 bg-ink/40" />
            <QrCode className="size-12 text-ink" strokeWidth={1.25} aria-hidden />
          </div>
        </div>
        <div className="mx-auto w-44 rounded-[1.6rem] border border-white/15 bg-[#0d1320] p-2 shadow-2xl shadow-black/50">
          <div className="rounded-[1.2rem] bg-white/[0.04] px-3 py-6 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-mint/15">
              <ShieldCheck className="size-6 text-mint" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-semibold">Documento auténtico</p>
            <p className="mt-1 font-mono text-[10px] text-white/45">emitido · vigente</p>
            <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] text-white/40">
              <Lock className="size-3" aria-hidden /> verificado por QR
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

export function Proyectos() {
  const [activo, setActivo] = useState(PROYECTOS[0]!.clave);
  const botones = useRef<Record<string, HTMLButtonElement | null>>({});
  const proyecto = PROYECTOS.find((p) => p.clave === activo) ?? PROYECTOS[0]!;

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = PROYECTOS.findIndex((p) => p.clave === activo);
    const paso = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!paso) return;
    e.preventDefault();
    const destino = PROYECTOS[(i + paso + PROYECTOS.length) % PROYECTOS.length]!.clave;
    setActivo(destino);
    botones.current[destino]?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
      <div role="tablist" aria-label="Proyectos" aria-orientation="vertical" onKeyDown={alTeclear} className="revelar border-t border-white/10">
        {PROYECTOS.map((p, i) => {
          const sel = p.clave === activo;
          return (
            <div key={p.clave} className="border-b border-white/10">
              <button
                ref={(el) => {
                  botones.current[p.clave] = el;
                }}
                type="button"
                role="tab"
                id={`proyecto-${p.clave}`}
                aria-selected={sel}
                aria-controls={`proyecto-panel-${p.clave}`}
                tabIndex={sel ? 0 : -1}
                onClick={() => setActivo(p.clave)}
                className="group grid w-full grid-cols-[2.5rem_1fr] gap-x-2 py-5 text-left"
              >
                <span className={cn("pt-1 font-mono text-xs transition-colors", sel ? "text-mint" : "text-white/35 group-hover:text-white/60")}>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className={cn("block text-lg font-semibold transition-colors sm:text-xl", sel ? "text-white" : "text-white/55 group-hover:text-white/85")}>{p.titulo}</span>
                  <span className="mt-1 block font-mono text-[11px] text-white/40">{p.areas.map((a) => `// ${a}`).join("  ")}</span>
                </span>
              </button>
              <div id={`proyecto-panel-${p.clave}`} role="tabpanel" aria-labelledby={`proyecto-${p.clave}`} hidden={!sel} className="pb-6 pl-[3rem]">
                <p className="text-white/65">{p.reto}</p>
                <ul className="mt-4 space-y-2">
                  {p.hecho.map((h) => (
                    <li key={h} className="flex gap-2 text-sm text-white/75">
                      <Check className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
                      {h}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span key={s} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/55">
                      {s}
                    </span>
                  ))}
                </p>
                {/* En celular la maqueta va debajo del proyecto abierto. */}
                <div aria-hidden className="mt-6 lg:hidden">
                  {p.maqueta()}
                  <p className="mt-3 font-mono text-[11px] text-white/35">Maqueta ilustrativa, sin datos de clientes.</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div aria-hidden className="hidden lg:block">
        <div className="sticky top-28">
          <div key={proyecto.clave} className="entrada">
            {proyecto.maqueta()}
          </div>
          <p className="mt-4 font-mono text-[11px] text-white/35">Maqueta ilustrativa, sin datos de clientes.</p>
        </div>
      </div>
    </div>
  );
}
