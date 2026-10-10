import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { Button } from "@/components/ui/button";

/** Landing provisional: la versión completa llega en la Fase 7. */
export default function Inicio() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-ink text-white">
      <Brackets className="absolute -right-16 -top-16 h-[28rem] w-auto opacity-[0.12]" color="#1CE783" />
      <header className="relative flex h-20 items-center justify-between px-6 md:px-12">
        <Logo variante="claro" alto={32} priority />
        <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
          <Link href="/login">Ingresar</Link>
        </Button>
      </header>
      <section className="relative flex flex-1 flex-col justify-center px-6 pb-20 md:px-12">
        <p className="font-mono text-sm text-mint">{"// soporte técnico en Perú"}</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight md:text-5xl">
          Tu equipo al día, con una ficha técnica de cada servicio.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/70">
          Mantenimiento, soporte remoto, redes y recuperación de información. Te explico qué revisé, qué hice y qué
          sigue.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="mint" size="lg">
            <Link href="/login">
              Pedir cotización <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
            <Link href="/login">Escribir por WhatsApp</Link>
          </Button>
        </div>
        <p className="mt-10 font-mono text-[11px] text-white/40">
          Landing completa en la Fase 7 · [PENDIENTE: zona de atención, WhatsApp]
        </p>
      </section>
    </main>
  );
}
