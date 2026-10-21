"use client";

import dynamic from "next/dynamic";

/**
 * El formulario de contacto (React Hook Form + Zod, ~38 kB) se carga en el navegador después de
 * pintar la landing, no en su primer HTML. Desde un Server Component, `dynamic()` igual lo incluía
 * en la carga inicial; con `ssr: false` (que solo se permite en un componente de cliente) no.
 * Sin JavaScript queda el bloque de espera, y arriba siguen WhatsApp y correo como vía principal.
 */
export const FormularioContactoDiferido = dynamic(() => import("@/components/landing/formulario-contacto").then((m) => m.FormularioContacto), {
  ssr: false,
  loading: () => <div aria-hidden className="min-h-[420px] animate-pulse rounded-xl border border-white/10 bg-white/[0.04]" />,
});
