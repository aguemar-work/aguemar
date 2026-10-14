import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { FormularioCliente } from "../formulario-cliente";

export const metadata: Metadata = { title: "Nueva empresa" };

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="01" titulo="Nueva empresa" descripcion="Registra a quién atiendes. Luego le das acceso y módulos desde su ficha." />
      <FormularioCliente />
    </div>
  );
}
