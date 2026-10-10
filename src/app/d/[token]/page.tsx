import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Documento",
  robots: { index: false, follow: false, nocache: true },
};

/** Portal del cliente: se implementa en la Fase 6. Página noindex. */
export default async function PortalDocumento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo alto={32} className="dark:hidden" />
      <Logo variante="claro" alto={32} className="hidden dark:block" />
      <div>
        <p className="font-mono text-xs text-muted-foreground">{"// portal del cliente"}</p>
        <h1 className="mt-2 text-xl font-semibold">Este documento estará disponible pronto.</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enlace <span className="font-mono">{token.slice(0, 8)}…</span> · portal disponible en la Fase 6.
        </p>
      </div>
    </main>
  );
}
