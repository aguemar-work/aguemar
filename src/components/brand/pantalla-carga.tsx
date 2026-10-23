import { Logo } from "@/components/brand/logo";

const PROPORCION = 12720 / 5835;
const ALTO = 56;

/**
 * Pantalla completa con el logo "cargando": respira y un brillo mint lo recorre (ver `.logo-carga` en
 * globals.css; con "reducir movimiento" queda quieto). Se pone mientras entra a su espacio.
 */
export function PantallaCarga({ texto = "Entrando…" }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pantalla-carga fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink text-white"
    >
      <div className="logo-carga relative" style={{ width: Math.round(ALTO * PROPORCION), height: ALTO }}>
        <Logo variante="claro" alto={ALTO} priority />
        <span aria-hidden className="logo-carga-brillo" />
      </div>
      <p className="font-mono text-sm text-white/60">{texto}</p>
    </div>
  );
}
