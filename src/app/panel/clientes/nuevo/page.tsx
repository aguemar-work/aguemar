import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { FormularioCliente } from "../formulario-cliente";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Nueva empresa" };

export default async function NuevoClientePage() {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="01" titulo="Nueva empresa" descripcion="Registra a quién atiendes. Luego le das acceso y módulos desde su ficha." />
      <FormularioCliente />
    </div>
  );
}
