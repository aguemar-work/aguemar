import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { FormularioCliente } from "../formulario-cliente";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader codigo="01" titulo="Nuevo cliente" descripcion="Registra a quién le vas a cotizar o atender." />
      <FormularioCliente />
    </div>
  );
}
