import type { Metadata } from "next";
import { Laptop } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Equipos" };

export default function EquiposPage() {
  return (
    <>
      <PageHeader codigo="02" titulo="Equipos" descripcion="Cada equipo pertenece a un cliente y guarda su historial de fichas." />
      <EmptyState
        icono={Laptop}
        titulo="Aún no hay equipos."
        descripcion="Registra un equipo desde la ficha de un cliente. Disponible en la Fase 2."
        accion={<Button variant="mint" disabled>Nuevo equipo</Button>}
      />
    </>
  );
}
