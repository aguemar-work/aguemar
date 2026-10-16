import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { listarServicios } from "@/lib/datos/servicios";
import { ListaServicios } from "./lista-servicios";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServiciosPage() {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const servicios = await listarServicios();
  return (
    <>
      <PageHeader codigo="03" titulo="Servicios" descripcion="Catálogo que alimenta la landing y las cotizaciones. El orden es el que se muestra." />
      <ListaServicios servicios={servicios} />
    </>
  );
}
