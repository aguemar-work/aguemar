"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Tipo = "comando" | "marca" | "texto" | "listo" | "comentario" | "dato" | "vacio";

/** Salida del script real (`public/diagnostico-agueMar.ps1`) y un resumen de lo que encontró en FT-2026-001. */
const LINEAS: { tipo: Tipo; texto: string; dato?: string }[] = [
  { tipo: "comando", texto: ".\\diagnostico-agueMar.ps1" },
  { tipo: "vacio", texto: "" },
  { tipo: "marca", texto: "  aguemar · diagnóstico del equipo" },
  { tipo: "texto", texto: "  Reuniendo información, tarda menos de un minuto..." },
  { tipo: "vacio", texto: "" },
  { tipo: "listo", texto: "  Listo: Escritorio\\diagnostico-••••••••-2026••••.json" },
  { tipo: "texto", texto: '  También quedó copiado: en la ficha, usa "Importar diagnóstico" y pégalo.' },
  { tipo: "vacio", texto: "" },
  { tipo: "comentario", texto: "# lo que encontró, en resumen" },
  { tipo: "dato", texto: "equipo", dato: "Lenovo 83LT · serie ••••••••" },
  { tipo: "dato", texto: "disco", dato: "SSD · desgaste 0 %" },
  { tipo: "dato", texto: "batería", dato: "99,7 % de salud · 392 ciclos" },
  { tipo: "dato", texto: "sistema", dato: "0 errores de integridad" },
];

const INDICADORES = [
  { valor: "0 %", texto: "desgaste del SSD" },
  { valor: "99,7 %", texto: "salud de batería · 392 ciclos" },
  { valor: "0", texto: "errores de integridad" },
  { valor: "3/3", texto: "incidencias resueltas" },
];

const INCIDENCIAS = [
  "Error 0x80073D02 al actualizar WhatsApp Beta",
  "Imágenes que no se veían en Office",
  "Nitro PDF no aceptaba contraseñas por la captura de teclado remota",
];

const PROMPT = "PS C:\\Users\\soporte>";

/**
 * La terminal corre el diagnóstico línea por línea cuando entra en pantalla y, al terminar,
 * aparece la ficha técnica. Sin JavaScript o con "reducir movimiento", todo se ve completo desde el inicio.
 */
export function EvidenciaFicha({ qr }: { qr: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  // null = todo visible (servidor, sin animación); número = líneas mostradas.
  const [visibles, setVisibles] = useState<number | null>(null);
  const [ficha, setFicha] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Si ya está en pantalla al cargar, no se esconde nada.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;

    setVisibles(0);
    setFicha(false);
    const tiempos: number[] = [];
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        observador.disconnect();
        let t = 900; // el comando se escribe primero
        LINEAS.forEach((linea, i) => {
          tiempos.push(window.setTimeout(() => setVisibles(i + 1), i === 0 ? 0 : t));
          if (i > 0) t += linea.tipo === "texto" && i === 3 ? 1100 : linea.tipo === "vacio" ? 120 : 260;
        });
        tiempos.push(window.setTimeout(() => setFicha(true), t + 500));
      },
      { threshold: 0.4 },
    );
    observador.observe(el);
    return () => {
      observador.disconnect();
      tiempos.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const verLinea = (i: number) => visibles === null || i < visibles;
  const escribiendo = visibles !== null && visibles < LINEAS.length;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      {/* Terminal */}
      <div ref={ref} className="revelar overflow-hidden rounded-2xl border border-white/10 bg-[#070b13]/90 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-mint/80" />
          <span className="ml-3 font-mono text-[11px] text-white/40">Windows PowerShell · administrador</span>
        </div>
        <pre className="p-5 font-mono text-[12px] leading-relaxed text-white/75 sm:text-[13px]" aria-label="Salida del script de diagnóstico">
          {LINEAS.map((l, i) => (
            <div key={i} className={cn("min-h-[1.6em] whitespace-pre-wrap break-words transition-opacity duration-200", verLinea(i) ? "opacity-100" : "opacity-0")}>
              {l.tipo === "comando" || l.tipo === "comentario" ? (
                <>
                  <span className="text-white/40">{PROMPT} </span>
                  <span className={cn(l.tipo === "comando" ? "text-white" : "text-white/40", l.tipo === "comando" && visibles === 1 && "escribir inline-block")}>{l.texto}</span>
                </>
              ) : l.tipo === "dato" ? (
                <>
                  <span className="text-white/40">{`  ${l.texto.padEnd(10)}`}</span>
                  <span className="text-white">{l.dato}</span>
                </>
              ) : (
                <span className={cn(l.tipo === "marca" && "text-mint", l.tipo === "listo" && "text-mint")}>{l.texto}</span>
              )}
            </div>
          ))}
          <div className="min-h-[1.6em]">
            <span className="text-white/40">{PROMPT} </span>
            {!escribiendo ? <span className="cursor-mono" /> : null}
          </div>
        </pre>
      </div>

      {/* Ficha: el documento que recibe la empresa (los PDF siempre son claros). */}
      <div className={cn("transition-all duration-700 ease-out lg:mt-10", ficha ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
        <article className="rounded-2xl bg-white p-6 text-ink shadow-2xl shadow-black/50 lg:-rotate-[1.5deg]" aria-label="Ficha técnica de ejemplo FT-2026-001">
          <header className="flex items-center justify-between font-mono text-[11px] text-muted">
            <span>FICHA TÉCNICA</span>
            <span className="text-ink">FT-2026-001</span>
          </header>
          <p className="mt-5 font-mono text-xs text-mint-ink">{"// soporte"}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">Mantenimiento preventivo</h3>
            <span className="rounded-full bg-mint-soft px-2.5 py-0.5 text-xs font-medium text-mint-ink">Óptimo</span>
          </div>
          <p className="mt-1 text-sm text-muted">Lenovo 83LT · Empresa ••••••</p>

          <dl className="mt-5 grid grid-cols-2 gap-2">
            {INDICADORES.map((ind) => (
              <div key={ind.texto} className="flex flex-col rounded-lg bg-soft p-3">
                <dt className="order-2 text-[11px] leading-tight text-muted">{ind.texto}</dt>
                <dd className="font-mono text-2xl font-semibold text-ink">{ind.valor}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 font-mono text-[11px] text-mint-ink">01 · Incidencias</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {INCIDENCIAS.map((inc) => (
              <li key={inc} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-mint-ink" aria-hidden />
                {inc}
              </li>
            ))}
          </ul>

          <footer className="mt-5 flex items-center gap-4 border-t border-line pt-4">
            {qr ? <Image src={qr} alt="" width={64} height={64} unoptimized className="size-16 shrink-0" /> : null}
            <p className="text-xs text-muted">
              <span className="font-medium text-ink">Verificable.</span> En una ficha real, el QR abre el documento original publicado.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}
