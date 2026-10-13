import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { AvisoBackend } from "@/components/panel/aviso-backend";
import { backendConfigurado } from "@/lib/env";
import { FormularioLogin } from "./formulario-login";

export const metadata: Metadata = {
  title: "Ingresar",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ siguiente?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const { siguiente } = await searchParams;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Lado de marca */}
      <section className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Brackets className="absolute -right-10 -top-10 h-72 w-auto opacity-[0.12]" color="#1CE783" />
        <Logo variante="claro" alto={40} priority />
        <div className="relative max-w-md">
          <p className="font-mono text-sm text-mint">{"// panel privado"}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight">
            Cotizaciones y fichas técnicas con tu marca, en minutos.
          </h1>
          <p className="mt-3 text-white/70">Gestiona clientes, equipos y documentos desde un solo lugar.</p>
        </div>
        <p className="font-mono text-[11px] text-white/50">agueMar · soporte técnico</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo alto={32} priority className="dark:hidden" />
            <Logo variante="claro" alto={32} className="hidden dark:block" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ingresa a tu panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entra con tu correo y tu contraseña.
            </p>
          </div>

          {!backendConfigurado ? <AvisoBackend /> : null}

          <FormularioLogin siguiente={siguiente ?? "/panel"} />

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Volver al sitio
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
