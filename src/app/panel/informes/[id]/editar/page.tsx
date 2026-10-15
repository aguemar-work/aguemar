import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { opcionesTrabajos } from "@/lib/datos/fichas";
import { obtenerInformeFila } from "@/lib/datos/informes";
import { FormularioInforme } from "../../formulario-informe";

export const metadata: Metadata = { title: "Editar informe" };

export default async function EditarInformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [informe, clientes, trabajos] = await Promise.all([obtenerInformeFila(id), opcionesClientes(), opcionesTrabajos()]);
  if (!informe) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo={`Editar ${informe.numero}`} descripcion={informe.publicado ? "Está publicado: la empresa verá los cambios al guardar." : undefined} />
      <FormularioInforme informe={informe} clientes={clientes} trabajos={trabajos} />
    </div>
  );
}
