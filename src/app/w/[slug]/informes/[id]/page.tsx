import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VistaInforme } from "@/components/documentos/vista-informe";
import { Hilo } from "@/components/comentarios/hilo";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { comentarEmpresa } from "../../acciones";

export const metadata: Metadata = { title: "Informe" };

export default async function InformeWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, i, comentarios] = await Promise.all([ws.miEmpresa(), ws.informe(id), ws.comentarios("informe", id)]);
  if (!moduloActivo(empresa?.modulos, "informes") || !i) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/w/${slug}/informes`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Informes
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="mint">
            <a href={`/w/${slug}/informes/${i.id}/pdf`} target="_blank" rel="noopener">
              <FileDown /> Ver PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/w/${slug}/informes/${i.id}/pdf?descargar=1`}>Descargar</a>
          </Button>
        </div>
      </div>
      <VistaInforme i={i} />
      <Hilo
        comentarios={comentarios}
        vista="empresa"
        nombrePropietario={empresa?.marca?.responsable ?? "aguemar"}
        nombreEmpresa={empresa?.nombre ?? "Tú"}
        enviar={comentarEmpresa.bind(null, slug, "informe", id)}
        descripcion="¿Algo no quedó claro o quieres priorizar algo para el próximo periodo? Escríbenos aquí."
      />
    </div>
  );
}
