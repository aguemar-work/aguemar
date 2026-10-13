import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { obtenerEquipo } from "@/lib/datos/equipos";
import { opcionesClientes } from "@/lib/datos/clientes";
import { FormularioEquipo } from "../../formulario-equipo";

export const metadata: Metadata = { title: "Editar equipo" };

export default async function EditarEquipoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [equipo, clientes] = await Promise.all([obtenerEquipo(id), opcionesClientes()]);
  if (!equipo) notFound();
  const nombre = [equipo.marca, equipo.modelo].filter(Boolean).join(" ") || equipo.serie;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="02" titulo={`Editar: ${nombre}`} descripcion="El cliente no se puede cambiar; crea otro equipo si cambió de dueño." />
      <FormularioEquipo equipo={equipo} clientes={clientes} />
    </div>
  );
}
