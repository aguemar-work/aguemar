import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";

/** 404 dentro del panel: conserva la barra lateral y vuelve al inicio, en vez de sacar a la 404 general. */
export default function NoEncontradaPanel() {
  return (
    <EmptyState
      icono={SearchX}
      titulo="No encontramos esto."
      descripcion="Puede que se haya eliminado o que el enlace esté mal escrito."
      accion={
        <Button asChild variant="mint">
          <Link href="/panel">Volver al inicio</Link>
        </Button>
      }
    />
  );
}
