"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, Home, KanbanSquare, Receipt, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TextosLanding } from "@/lib/landing-textos";

/**
 * Maqueta compacta del espacio de una empresa (/w/[slug]) para la landing: tres módulos
 * que se recorren con pestañas. Todo es de ejemplo, con datos ficticios.
 */

type Modulo = "inicio" | "proyectos" | "cotizaciones";

type TextosDemo = TextosLanding["demo"];

const MODULOS: { clave: Modulo; icono: LucideIcon }[] = [
  { clave: "inicio", icono: Home },
  { clave: "proyectos", icono: KanbanSquare },
  { clave: "cotizaciones", icono: Receipt },
];

function Pildora({ children }: { children: ReactNode }) {
  return <span className="inline-flex shrink-0 rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-medium text-mint">{children}</span>;
}

function Bloque({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-white/[0.07] bg-white/[0.04] p-3", className)}>{children}</div>;
}

function Barra({ valor }: { valor: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-mint" style={{ width: `${valor}%` }} />
    </div>
  );
}

function Linea({ izquierda, derecha }: { izquierda: ReactNode; derecha: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-white/[0.07] py-2 last:border-0">
      <span className="min-w-0 truncate">{izquierda}</span>
      {derecha}
    </li>
  );
}

const CONTENIDO: Record<Modulo, (t: TextosDemo) => ReactNode> = {
  inicio: (t) => (
    <div className="grid gap-3 sm:grid-cols-2">
      <Bloque className="sm:col-span-2">
        <p className="text-xs text-white/50">{t.proyectoActivo}</p>
        <p className="mt-1 font-medium">{t.proyecto}</p>
        <Barra valor={75} />
        <p className="mt-1.5 flex justify-between font-mono text-[11px] text-white/50">
          <span>{t.tareas}</span>
          <span>75 %</span>
        </p>
      </Bloque>
      <Bloque>
        <p className="text-xs text-white/50">{t.proximaActividad}</p>
        <p className="mt-1 text-sm">{t.reunion}</p>
        <p className="font-mono text-[11px] text-mint">{t.fecha}</p>
      </Bloque>
      <Bloque>
        <p className="text-xs text-white/50">{t.respuesta}</p>
        <p className="mt-1 text-sm text-white/80">{t.comentario}</p>
      </Bloque>
    </div>
  ),
  proyectos: (t) => (
    <Bloque>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{t.proyecto}</p>
        <Pildora>{t.enCurso}</Pildora>
      </div>
      <ol className="mt-3 space-y-2.5">
        {[
          { etapa: t.etapas[0], avance: 100 },
          { etapa: t.etapas[1], avance: 100 },
          { etapa: t.etapas[2], avance: 60 },
          { etapa: t.etapas[3], avance: 0 },
        ].map((e, i) => (
          <li key={e.etapa}>
            <p className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-white/45">{String(i + 1).padStart(2, "0")}</span>
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
  cotizaciones: (t) => (
    <div className="grid gap-3">
      <Bloque>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[11px] text-white/50">COT-2026-012</p>
            <p className="font-medium">{t.proyecto}</p>
          </div>
          <Pildora>{t.aceptada}</Pildora>
        </div>
        <p className="mt-3 font-mono text-2xl font-semibold">{t.monto}</p>
      </Bloque>
      <Bloque>
        <ul className="text-sm">
          <Linea izquierda={t.adelanto} derecha={<span className="font-mono text-mint">{t.montoAdelanto}</span>} />
          <Linea izquierda={t.saldo} derecha={<span className="font-mono text-white/70">{t.montoSaldo}</span>} />
        </ul>
      </Bloque>
    </div>
  ),
};

export function EspacioDemo({ t }: { t: TextosDemo }) {
  const [activo, setActivo] = useState<Modulo>("inicio");
  const botones = useRef<Partial<Record<Modulo, HTMLButtonElement | null>>>({});

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = MODULOS.findIndex((m) => m.clave === activo);
    const destino = e.key === "ArrowRight" ? (i + 1) % MODULOS.length : e.key === "ArrowLeft" ? (i - 1 + MODULOS.length) % MODULOS.length : e.key === "Home" ? 0 : e.key === "End" ? MODULOS.length - 1 : null;
    if (destino === null) return;
    e.preventDefault();
    const clave = MODULOS[destino]!.clave;
    setActivo(clave);
    botones.current[clave]?.focus();
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1320] text-white">
      <p className="truncate border-b border-white/10 px-3 py-2 font-mono text-[11px] text-white/45">{t.ruta}{activo === "inicio" ? "" : `/${activo}`}</p>
      <div role="tablist" aria-label={t.aria} onKeyDown={alTeclear} className="flex gap-1 overflow-x-auto border-b border-white/10 p-2">
        {MODULOS.map(({ clave, icono: Icono }) => {
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
              className={cn("flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors", sel ? "bg-mint/15 text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white")}
            >
              <Icono className={cn("size-4", sel && "text-mint")} aria-hidden />
              {t.modulos[clave]}
            </button>
          );
        })}
      </div>
      <div id="espacio-panel" role="tabpanel" aria-labelledby={`modulo-${activo}`} className="min-h-[240px] p-4">
        {CONTENIDO[activo](t)}
      </div>
    </div>
  );
}
