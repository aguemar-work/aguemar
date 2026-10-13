import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { opcionesClientes } from "@/lib/datos/clientes";
import type { Area } from "@/types/database";
import { FormularioTrabajo } from "../formulario-trabajo";

export const metadata: Metadata = { title: "Nuevo trabajo" };

export default async function NuevoTrabajoPage({ searchParams }: { searchParams: Promise<{ cliente?: string; area?: string }> }) {
  const { cliente, area } = await searchParams;
  const clientes = await opcionesClientes();
  const areaValida = (["diseno", "desarrollo", "soporte"] as Area[]).includes(area as Area) ? (area as Area) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="04" titulo="Nuevo trabajo" descripcion="Un trabajo es cualquier cosa que haces para un cliente o para ti: lo que luego cotizas, cobras y documentas." />
      <FormularioTrabajo clientes={clientes} clienteInicial={cliente} areaInicial={areaValida} />
    </div>
  );
}
