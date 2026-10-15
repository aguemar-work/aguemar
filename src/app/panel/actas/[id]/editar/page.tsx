import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { obtenerActaFila } from "@/lib/datos/briefs-actas";
import { FormularioActa } from "@/app/panel/documentos/formulario-acta";

export const metadata: Metadata = { title: "Editar acta de entrega" };

export default async function EditarActaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [acta, clientes, trabajos] = await Promise.all([obtenerActaFila(id), opcionesClientes(), opcionesTrabajos()]);
  if (!acta) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo={`Editar ${acta.numero}`} descripcion={acta.publicada ? "Está publicada: la empresa verá los cambios al guardar." : undefined} />
      {acta.aceptada_en ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Esta acta ya fue aceptada: es el registro de la conformidad y no se edita.</p>
      ) : (
        <FormularioActa acta={acta} clientes={clientes} trabajos={trabajos} />
      )}
    </div>
  );
}
