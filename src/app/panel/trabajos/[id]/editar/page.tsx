import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { obtenerTrabajo } from "@/lib/datos/trabajos";
import { FormularioTrabajo } from "../../formulario-trabajo";

export const metadata: Metadata = { title: "Editar trabajo" };

export default async function EditarTrabajoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [trabajo, clientes] = await Promise.all([obtenerTrabajo(id), opcionesClientes()]);
  if (!trabajo) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="04" titulo={`Editar: ${trabajo.titulo}`} />
      <FormularioTrabajo trabajo={trabajo} clientes={clientes} />
    </div>
  );
}
