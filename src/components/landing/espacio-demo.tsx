"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CalendarDays, Check, FileBarChart, FileCheck2, Home, Inbox, KanbanSquare, Plus, Receipt, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Maqueta del espacio de una empresa (/w/[slug]) para la landing: se puede recorrer
 * módulo por módulo. Todo es de ejemplo, con datos ficticios.
 */

type Modulo = "inicio" | "proyectos" | "calendario" | "informes" | "documentos" | "cotizaciones" | "solicitudes";

const MODULOS: { clave: Modulo; nombre: string; icono: LucideIcon }[] = [
  { clave: "inicio", nombre: "Inicio", icono: Home },
  { clave: "proyectos", nombre: "Proyectos", icono: KanbanSquare },
  { clave: "calendario", nombre: "Calendario", icono: CalendarDays },
  { clave: "informes", nombre: "Informes", icono: FileBarChart },
  { clave: "documentos", nombre: "Documentos", icono: FileCheck2 },
  { clave: "cotizaciones", nombre: "Cotizaciones", icono: Receipt },
  { clave: "solicitudes", nombre: "Solicitudes", icono: Inbox },
];

function Pildora({ children, tono = "menta" }: { children: ReactNode; tono?: "menta" | "aviso" | "tenue" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tono === "menta" && "bg-mint/15 text-mint",
        tono === "aviso" && "bg-[#f2c35b]/15 text-[#f2c35b]",
        tono === "tenue" && "bg-white/10 text-white/60",
      )}
    >
      {children}
    </span>
  );
}

function Bloque({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-white/[0.07] bg-white/[0.04] p-4", className)}>{children}</div>;
}

function Barra({ valor }: { valor: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-mint transition-[width] duration-700" style={{ width: `${valor}%` }} />
    </div>
  );
}

function Fila({ izquierda, derecha }: { izquierda: ReactNode; derecha: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2.5 last:border-0">
      <span className="min-w-0 truncate">{izquierda}</span>
      {derecha}
    </li>
  );
}

const CONTENIDO: Record<Modulo, () => ReactNode> = {
  inicio: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Bloque className="sm:col-span-2">
        <p className="text-xs text-white/50">Proyecto activo</p>
        <p className="mt-1 font-medium">Web corporativa</p>
        <Barra valor={75} />
        <p className="mt-1.5 flex justify-between font-mono text-[11px] text-white/50">
          <span>6/8 tareas</span>
          <span>75 %</span>
        </p>
      </Bloque>
      <Bloque>
        <p className="text-xs text-white/50">Próxima actividad</p>
        <p className="mt-1 text-sm">Reunión de avance</p>
        <p className="font-mono text-[11px] text-mint">jue 22/10 · 10:00</p>
      </Bloque>
      <Bloque>
        <p className="text-xs text-white/50">Último informe</p>
        <p className="mt-1 text-sm">Avance de setiembre</p>
        <p className="font-mono text-[11px] text-white/50">INF-2026-007 · PDF</p>
      </Bloque>
      <Bloque className="sm:col-span-2">
        <p className="text-xs text-white/50">Respuesta a tu comentario</p>
        <p className="mt-1 text-sm text-white/80">“Listo, ya subí la versión con el logo nuevo. Revísala cuando puedas.”</p>
      </Bloque>
    </div>
  ),
  proyectos: () => (
    <Bloque>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Web corporativa</p>
        <Pildora>En curso</Pildora>
      </div>
      <ol className="mt-4 space-y-3">
        {[
          { etapa: "Descubrimiento", avance: 100 },
          { etapa: "Diseño", avance: 100 },
          { etapa: "Desarrollo", avance: 60 },
          { etapa: "Entrega", avance: 0 },
        ].map((e, i) => (
          <li key={e.etapa}>
            <p className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-white/40">{String(i + 1).padStart(2, "0")}</span>
                {e.etapa}
              </span>
              {e.avance === 100 ? <Check className="size-4 text-mint" aria-hidden /> : <span className="font-mono text-[11px] text-white/50">{e.avance} %</span>}
            </p>
            <Barra valor={e.avance} />
          </li>
        ))}
      </ol>
    </Bloque>
  ),
  calendario: () => {
    // Octubre de 2026 empieza en jueves.
    const marcados: Record<number, string> = { 8: "bg-white/40", 15: "bg-mint", 22: "bg-mint", 29: "bg-[#f2c35b]" };
    return (
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <Bloque>
          <p className="text-sm font-medium">octubre 2026</p>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-white/40">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
            {Array.from({ length: 3 }, (_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: 31 }, (_, i) => i + 1).map((dia) => (
              <span key={dia} className={cn("relative rounded py-1", dia === 22 && "bg-mint/15 text-white")}>
                {dia}
                {marcados[dia] ? <span className={cn("absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full", marcados[dia])} /> : null}
              </span>
            ))}
          </div>
        </Bloque>
        <Bloque>
          <ul className="text-sm">
            <Fila izquierda="Publicación en redes" derecha={<span className="font-mono text-[11px] text-white/50">15/10</span>} />
            <Fila izquierda="Reunión de avance" derecha={<span className="font-mono text-[11px] text-mint">22/10</span>} />
            <Fila izquierda="Mantenimiento" derecha={<span className="font-mono text-[11px] text-[#f2c35b]">29/10</span>} />
          </ul>
        </Bloque>
      </div>
    );
  },
  informes: () => (
    <Bloque>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] text-white/50">INF-2026-007</p>
          <p className="font-medium">Avance de setiembre</p>
        </div>
        <Pildora tono="tenue">PDF</Pildora>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2">
        {[
          ["14", "tareas cerradas"],
          ["3", "entregables"],
          ["2", "reuniones"],
          ["5", "piezas publicadas"],
        ].map(([valor, texto]) => (
          <div key={texto} className="flex flex-col rounded-lg bg-white/[0.05] p-3">
            <dt className="order-2 text-[11px] text-white/50">{texto}</dt>
            <dd className="font-mono text-xl font-semibold text-mint">{valor}</dd>
          </div>
        ))}
      </dl>
    </Bloque>
  ),
  documentos: () => (
    <Bloque>
      <ul className="text-sm">
        <Fila izquierda={<><span className="font-mono text-[11px] text-white/50">FT-2026-001</span> Ficha técnica</>} derecha={<Pildora>Publicado</Pildora>} />
        <Fila izquierda={<><span className="font-mono text-[11px] text-white/50">BR-2026-004</span> Brief de la web</>} derecha={<Pildora>Publicado</Pildora>} />
        <Fila izquierda={<><span className="font-mono text-[11px] text-white/50">AE-2026-002</span> Acta de entrega</>} derecha={<Pildora tono="aviso">Por aceptar</Pildora>} />
      </ul>
    </Bloque>
  ),
  cotizaciones: () => (
    <div className="grid gap-3">
      <Bloque>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] text-white/50">COT-2026-012</p>
            <p className="font-medium">Web corporativa</p>
          </div>
          <Pildora>Aceptada</Pildora>
        </div>
        <p className="mt-3 font-mono text-2xl font-semibold">S/ 2 450,00</p>
      </Bloque>
      <Bloque>
        <ul className="text-sm">
          <Fila izquierda="Adelanto 50 %" derecha={<span className="font-mono text-mint">S/ 1 225,00</span>} />
          <Fila izquierda="Saldo" derecha={<span className="font-mono text-white/70">S/ 1 225,00</span>} />
        </ul>
      </Bloque>
    </div>
  ),
  solicitudes: () => (
    <Bloque>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-ink">
        <Plus className="size-3.5" aria-hidden /> Nueva solicitud
      </span>
      <ul className="mt-3 text-sm">
        <Fila izquierda="Cambiar el banner de la portada" derecha={<Pildora tono="aviso">En revisión</Pildora>} />
        <Fila izquierda="Revisar la impresora de recepción" derecha={<Pildora>Resuelta</Pildora>} />
      </ul>
    </Bloque>
  ),
};

export function EspacioDemo() {
  const [activo, setActivo] = useState<Modulo>("inicio");
  const botones = useRef<Partial<Record<Modulo, HTMLButtonElement | null>>>({});

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = MODULOS.findIndex((m) => m.clave === activo);
    const siguiente = e.key === "ArrowDown" || e.key === "ArrowRight";
    const anterior = e.key === "ArrowUp" || e.key === "ArrowLeft";
    if (!siguiente && !anterior) return;
    e.preventDefault();
    const destino = MODULOS[(i + (siguiente ? 1 : -1) + MODULOS.length) % MODULOS.length]!.clave;
    setActivo(destino);
    botones.current[destino]?.focus();
  };

  return (
    <div className="revelar overflow-hidden rounded-2xl border border-white/10 bg-[#0d1320]/95 text-white shadow-2xl shadow-black/50 backdrop-blur">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-mint/80" />
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md bg-white/[0.05] px-3 py-1 font-mono text-[11px] text-white/50">
          aguemar.com/w/tu-empresa{activo === "inicio" ? "" : `/${activo}`}
        </span>
      </div>
      <div className="grid md:grid-cols-[13rem_1fr]">
        <div
          role="tablist"
          aria-label="Módulos del espacio"
          aria-orientation="vertical"
          onKeyDown={alTeclear}
          className="flex gap-1 overflow-x-auto border-b border-white/10 p-2 md:flex-col md:border-b-0 md:border-r"
        >
          {MODULOS.map(({ clave, nombre, icono: Icono }) => {
            const sel = clave === activo;
            return (
              <button
                key={clave}
                ref={(el) => {
                  botones.current[clave] = el;
                }}
                type="button"
                role="tab"
                id={`modulo-${clave}`}
                aria-selected={sel}
                aria-controls="espacio-panel"
                tabIndex={sel ? 0 : -1}
                onClick={() => setActivo(clave)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  sel ? "bg-mint/15 text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icono className={cn("size-4", sel && "text-mint")} aria-hidden />
                {nombre}
              </button>
            );
          })}
        </div>
        <div id="espacio-panel" role="tabpanel" aria-labelledby={`modulo-${activo}`} className="min-h-[340px] p-4 sm:p-6">
          <div key={activo} className="entrada">
            <p className="mb-4 text-lg font-semibold">{MODULOS.find((m) => m.clave === activo)?.nombre}</p>
            {CONTENIDO[activo]()}
          </div>
        </div>
      </div>
    </div>
  );
}
