import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false, follow: false } };

/** 404 de toda la app (también la usan los módulos inactivos del workspace). */
export default function NoEncontrada() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden p-6 text-center">
      <Brackets className="absolute -right-16 -top-10 h-80 w-auto text-mint-ink opacity-[0.08] dark:text-mint" />
      <Logo alto={32} className="dark:hidden" />
      <Logo variante="claro" alto={32} className="hidden dark:block" />
      <div className="max-w-md">
        <p className="font-mono text-xs text-muted-foreground">{"// 404"}</p>
        <h1 className="mt-2 text-xl font-semibold">No encontramos esta página.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Puede que el enlace esté mal escrito, que el contenido ya no exista o que no tengas acceso a él.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="mint">
          <Link href="/login">Ir a mi espacio</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  );
}
