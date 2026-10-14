import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import { listarServicios } from "@/lib/datos/servicios";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { obtenerCotizacion } from "@/lib/datos/cotizaciones";
import { FormularioCotizacion } from "../../formulario-cotizacion";

export const metadata: Metadata = { title: "Editar cotización" };

export default async function EditarCotizacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [cotizacion, clientes, servicios, marca] = await Promise.all([obtenerCotizacion(id), opcionesClientes(), listarServicios(), obtenerPerfilMarca()]);
  if (!cotizacion) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        codigo="05"
        titulo={`Editar ${cotizacion.numero}`}
        descripcion={cotizacion.estado === "enviada" ? "Ya fue enviada: la empresa verá los cambios al instante." : undefined}
      />
      {cotizacion.estado === "aceptada" ? (
        <p className="rounded-md border border-border p-4 text-sm text-muted-foreground">Una cotización aceptada no se edita. Duplícala para hacer otra versión.</p>
      ) : (
        <FormularioCotizacion cotizacion={cotizacion} clientes={clientes} servicios={servicios} marca={marca} />
      )}
    </div>
  );
}
