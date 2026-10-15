import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { opcionesClientes } from "@/lib/datos/clientes";
import { listarPlantillas } from "@/lib/datos/marca";
import { opcionesEquipos, opcionesTrabajos } from "@/lib/datos/fichas";
import { FormularioFicha } from "../formulario-ficha";

export const metadata: Metadata = { title: "Nueva ficha técnica" };

export default async function NuevaFichaPage({ searchParams }: { searchParams: Promise<{ cliente?: string; equipo?: string; trabajo?: string }> }) {
  const inicial = await searchParams;
  const [clientes, equipos, trabajos, plantillas] = await Promise.all([opcionesClientes(), opcionesEquipos(), opcionesTrabajos(), listarPlantillas()]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader codigo="06" titulo="Nueva ficha técnica" descripcion="Elige la empresa e importa el diagnóstico del equipo. Queda en borrador hasta que la publiques." />
      {clientes.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Primero necesitas una empresa."
          descripcion="Toda ficha pertenece a una empresa."
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/clientes/nuevo">
                <Plus /> Nueva empresa
              </Link>
            </Button>
          }
        />
      ) : (
        <FormularioFicha clientes={clientes} equipos={equipos} trabajos={trabajos} plantillas={plantillas} inicial={inicial} />
      )}
    </div>
  );
}
