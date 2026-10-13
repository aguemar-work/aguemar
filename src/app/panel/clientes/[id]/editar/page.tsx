import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { obtenerCliente } from "@/lib/datos/clientes";
import { FormularioCliente } from "../../formulario-cliente";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await obtenerCliente(id);
  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="01" titulo={`Editar: ${cliente.nombre}`} descripcion="Los cambios se reflejan en los documentos nuevos." />
      <FormularioCliente cliente={cliente} />
    </div>
  );
}
