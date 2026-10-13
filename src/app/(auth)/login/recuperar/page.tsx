import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { AvisoBackend } from "@/components/panel/aviso-backend";
import { backendConfigurado } from "@/lib/env";
import { FormularioRecuperar } from "./formulario-recuperar";

export const metadata: Metadata = {
  title: "Crear o recuperar contraseña",
  robots: { index: false, follow: false },
};

export default function RecuperarPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Logo alto={32} priority className="dark:hidden" />
          <Logo variante="claro" alto={32} className="hidden dark:block" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Crear o recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Te enviamos un código de 6 dígitos al correo. Con él defines tu contraseña nueva.
          </p>
        </div>

        {!backendConfigurado ? <AvisoBackend /> : null}

        <FormularioRecuperar />

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
