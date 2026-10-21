import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { opcionesClientes } from "@/lib/datos/clientes";
import { FormularioEquipo } from "../formulario-equipo";

export const metadata: Metadata = { title: "Nuevo equipo" };

export default async function NuevoEquipoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const clientes = await opcionesClientes();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="02" titulo="Nuevo equipo" descripcion="Registra el equipo con su serie para seguir su historial." />
      {clientes.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Primero necesitas un cliente."
          descripcion="Todo equipo pertenece a un cliente."
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/clientes/nuevo">
                <Plus /> Nuevo cliente
              </Link>
            </Button>
          }
        />
      ) : (
        <FormularioEquipo clientes={clientes} clienteInicial={cliente} />
      )}
    </div>
  );
}
