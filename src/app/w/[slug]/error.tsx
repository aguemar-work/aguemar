"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error de una página del workspace: conserva la navegación de la empresa y ofrece reintentar. */
export default function ErrorWorkspace({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { slug } = useParams<{ slug: string }>();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 text-center" aria-live="polite">
      <div className="max-w-md">
        <p className="font-mono text-xs text-muted-foreground">{"// error"}</p>
        <h1 className="mt-2 text-xl font-semibold">No pude cargar esta sección.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puede ser la conexión. Reintenta; si sigue pasando, avísanos{error.digest ? " con este código:" : "."}
        </p>
        {error.digest ? <p className="mt-1 font-mono text-xs text-muted-foreground">{error.digest}</p> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="mint" onClick={reset}>
          <RotateCw /> Reintentar
        </Button>
        <Button asChild variant="outline">
          <Link href={`/w/${slug}`}>Ir al inicio</Link>
        </Button>
      </div>
    </section>
  );
}
