import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <>
      <PageHeader codigo="01" titulo="Clientes" descripcion="Personas y empresas a las que atiendes." />
      <EmptyState
        icono={Users}
        titulo="Aún no hay clientes."
        descripcion="Crea el primero para empezar a cotizar y registrar sus equipos. Disponible en la Fase 2."
        accion={<Button variant="mint" disabled>Nuevo cliente</Button>}
      />
    </>
  );
}
