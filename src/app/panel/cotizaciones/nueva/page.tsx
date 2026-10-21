import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { opcionesClientes } from "@/lib/datos/clientes";
import { listarServicios } from "@/lib/datos/servicios";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { FormularioCotizacion } from "../formulario-cotizacion";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacionPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const { cliente } = await searchParams;
  const [clientes, servicios, marca] = await Promise.all([opcionesClientes(), listarServicios(), obtenerPerfilMarca()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="05" titulo="Nueva cotización" descripcion="Se guarda como borrador; la empresa la ve cuando la envías." />
      {clientes.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Primero necesitas una empresa."
          descripcion="Toda cotización va dirigida a una empresa."
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/clientes/nuevo">
                <Plus /> Nueva empresa
              </Link>
            </Button>
          }
        />
      ) : (
        <FormularioCotizacion clientes={clientes} servicios={servicios} marca={marca} clienteInicial={cliente} />
      )}
    </div>
  );
}
