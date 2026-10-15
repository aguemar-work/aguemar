import { CalendarDays, FileBarChart, KanbanSquare, ShieldCheck } from "lucide-react";

/**
 * Ilustración del espacio de una empresa (no son datos reales): cómo se ve
 * el avance de un proyecto, la próxima actividad, el informe del mes y una ficha verificable.
 */
export function MuestraEspacio() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md select-none">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-white/50">/w/tu-empresa</span>
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-white/20" />
            <span className="size-2 rounded-full bg-mint" />
          </span>
        </div>
        <div className="rounded-xl bg-white/[0.06] p-4">
          <p className="flex items-center gap-2 text-xs text-white/60">
            <KanbanSquare className="size-3.5" /> Proyecto
          </p>
          <p className="mt-1 font-medium">Web corporativa</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/4 rounded-full bg-mint" />
          </div>
          <p className="mt-1.5 flex justify-between font-mono text-[11px] text-white/50">
            <span>6/8 tareas</span>
            <span>75 %</span>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-white/60">
              <CalendarDays className="size-3.5" /> Próxima
            </p>
            <p className="mt-1 text-sm">Reunión de avance</p>
            <p className="font-mono text-[11px] text-mint">jue · 10:00</p>
          </div>
          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="flex items-center gap-1.5 text-[11px] text-white/60">
              <FileBarChart className="size-3.5" /> Informe
            </p>
            <p className="mt-1 text-sm">Avance del mes</p>
            <p className="font-mono text-[11px] text-white/50">INF · PDF</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-mint/10 p-3">
          <ShieldCheck className="size-5 shrink-0 text-mint" />
          <div>
            <p className="text-sm">Ficha técnica verificable</p>
            <p className="font-mono text-[11px] text-white/50">Mantenimiento · con QR</p>
          </div>
        </div>
      </div>
    </div>
  );
}
