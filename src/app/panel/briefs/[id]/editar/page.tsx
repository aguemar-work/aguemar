import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { obtenerBriefFila } from "@/lib/datos/briefs-actas";
import { FormularioBrief } from "@/app/panel/documentos/formulario-brief";

export const metadata: Metadata = { title: "Editar brief" };

export default async function EditarBriefPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [brief, clientes, trabajos] = await Promise.all([obtenerBriefFila(id), opcionesClientes(), opcionesTrabajos()]);
  if (!brief) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo={`Editar ${brief.numero}`} descripcion={brief.publicado ? "Está publicado: la empresa verá los cambios al guardar." : undefined} />
      <FormularioBrief brief={brief} clientes={clientes} trabajos={trabajos} />
    </div>
  );
}
