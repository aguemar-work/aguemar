import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VistaActa } from "@/components/documentos/vista-brief-acta";
import { AceptarDocumento } from "@/components/documentos/aceptar-documento";
import { ws } from "@/lib/datos/workspace";
import { moduloActivo } from "@/lib/modulos";
import { aceptarActaEmpresa } from "../../../acciones";

export const metadata: Metadata = { title: "Acta de entrega" };

export default async function ActaWorkspace({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const [empresa, a] = await Promise.all([ws.miEmpresa(), ws.acta(id)]);
  if (!moduloActivo(empresa?.modulos, "documentos") || !a) notFound();

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/w/${slug}/documentos`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Documentos
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="mint">
            <a href={`/w/${slug}/actas/${a.id}/pdf`} target="_blank" rel="noopener">
              <FileDown /> Ver PDF
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/w/${slug}/actas/${a.id}/pdf?descargar=1`}>Descargar</a>
          </Button>
        </div>
      </div>
      {!a.aceptacion ? (
        <div className="mb-8">
          <AceptarDocumento
            aceptar={aceptarActaEmpresa.bind(null, slug, a.id)}
            contacto={empresa?.contacto ?? null}
            titulo="Confirmar la recepción"
            descripcion="Revisa los entregables. Si todo está conforme, confirma con tu nombre y DNI; así queda registrada la entrega."
            conformidad="Recibí los entregables listados a mi conformidad."
            boton="Confirmar recepción"
            textoExito="¡Gracias! Recepción confirmada."
          />
        </div>
      ) : null}
      <VistaActa a={a} />
    </>
  );
}
