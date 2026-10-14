import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/insforge/server";
import { cerrarSesion } from "@/app/(auth)/acciones";

export const metadata: Metadata = { title: "Sin acceso", robots: { index: false, follow: false } };

export default async function SinAccesoPage() {
  const usuario = await obtenerUsuario();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo alto={32} className="dark:hidden" />
      <Logo variante="claro" alto={32} className="hidden dark:block" />
      <div className="max-w-md">
        <p className="font-mono text-xs text-muted-foreground">{"// acceso"}</p>
        <h1 className="mt-2 text-xl font-semibold">Tu cuenta no tiene un espacio asignado.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {usuario ? (
            <>
              Entraste como <span className="font-mono">{usuario.email}</span>, pero ese correo no está vinculado a ninguna empresa. Escríbenos para que te
              demos acceso.
            </>
          ) : (
            "Inicia sesión con el correo que te entregamos."
          )}
        </p>
      </div>
      <form action={cerrarSesion}>
        <Button type="submit" variant="outline">
          Cerrar sesión
        </Button>
      </form>
    </main>
  );
}
