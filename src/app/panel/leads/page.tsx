import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <>
      <PageHeader codigo="06" titulo="Leads" descripcion="Mensajes del formulario de contacto de la landing." />
      <EmptyState
        icono={Inbox}
        titulo="Sin mensajes todavía."
        descripcion="Cuando alguien escriba desde la landing, lo verás aquí. Disponible en la Fase 7."
        accion={<Button variant="mint" disabled>Crear cotización</Button>}
      />
    </>
  );
}
