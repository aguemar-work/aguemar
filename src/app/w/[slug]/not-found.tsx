import Link from "next/link";
import { MessageCircle, SearchX } from "lucide-react";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { ws } from "@/lib/datos/workspace";
import { enlaceWhatsApp } from "@/lib/landing";

/**
 * 404 dentro del espacio de la empresa: conserva su menú. También es lo que ve si entra a un módulo
 * que no tiene activo, así que lo explica y ofrece escribir. La empresa ya está en caché (layout).
 */
export default async function NoEncontradaWorkspace() {
  const empresa = await ws.miEmpresa().catch(() => null);
  const whatsapp = enlaceWhatsApp(empresa?.marca?.telefono ?? null, "Hola, necesito acceso a una sección de mi espacio en aguemar.");
  return (
    <EmptyState
      icono={SearchX}
      titulo="Esto no está disponible en tu espacio."
      descripcion="Puede que el enlace ya no exista o que esta sección no esté activa para tu empresa. Si la necesitas, escríbenos."
      accion={
        <div className="flex flex-wrap justify-center gap-2">
          {empresa?.slug ? (
            <Button asChild variant="mint">
              <Link href={`/w/${empresa.slug}`}>Volver a mi espacio</Link>
            </Button>
          ) : null}
          {whatsapp ? (
            <Button asChild variant="outline">
              <a href={whatsapp} target="_blank" rel="noopener">
                <MessageCircle /> Escribir por WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      }
    />
  );
}
