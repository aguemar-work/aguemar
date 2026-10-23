import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { AvisoBackend } from "@/components/panel/aviso-backend";
import { datosLanding } from "@/lib/datos/landing";
import { backendConfigurado, envPublico } from "@/lib/env";
import { enlaceWhatsApp } from "@/lib/landing";
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
  // El acceso nace de una invitación: quien aún no la tiene se la pide a aguemar por WhatsApp.
  const datos = await datosLanding().catch(() => null);
  const telefono = datos?.marca?.telefono ?? envPublico.NEXT_PUBLIC_WHATSAPP ?? null;
  const pedirAcceso = enlaceWhatsApp(telefono, "Hola, quiero pedir acceso a mi espacio en aguemar.");

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Lado de marca */}
      <section className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col">
        <Brackets className="absolute -bottom-12 -left-16 h-80 w-auto opacity-[0.12]" color="#1CE783" />
        <Logo variante="claro" alto={40} priority />
        <div className="relative mt-24 max-w-md xl:mt-32">
          <p className="font-mono text-sm text-mint">{"// tu espacio"}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight xl:text-5xl">
            Todo tu proyecto, en un solo lugar.
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Revisa avances, documentos, cotizaciones y pagos, y escríbenos cuando lo necesites.
          </p>
        </div>
        <p className="relative mt-auto font-mono text-[11px] text-white/50">aguemar · diseño · desarrollo · soporte</p>
      </section>

      {/* Formulario */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo alto={32} priority className="dark:hidden" />
            <Logo variante="claro" alto={32} className="hidden dark:block" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Ingresa</h2>
            <p className="mt-1 text-sm text-muted-foreground">Usa el correo con el que te invitamos.</p>
          </div>

          {!backendConfigurado ? <AvisoBackend /> : null}

          <FormularioLogin siguiente={siguiente ?? "/panel"} />

          <p className="text-center text-sm text-muted-foreground">
            ¿Aún no tienes acceso?{" "}
            {pedirAcceso ? (
              <a href={pedirAcceso} target="_blank" rel="noopener" className="font-medium text-foreground underline underline-offset-4">
                Pídeselo a aguemar
              </a>
            ) : (
              <Link href="/#contacto" className="font-medium text-foreground underline underline-offset-4">
                Pídeselo a aguemar
              </Link>
            )}
          </p>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="underline-offset-4 hover:underline">
              Volver a aguemar.com
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
