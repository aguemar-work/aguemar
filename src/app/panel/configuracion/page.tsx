import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { PestanasAjustes } from "@/components/panel/pestanas-ajustes";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { FormularioMarca } from "./formulario-marca";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Mi marca" };

export default async function ConfiguracionPage() {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const perfil = await obtenerPerfilMarca();

  return (
    <div className="mx-auto max-w-6xl">
      <PestanasAjustes actual="/panel/configuracion" />
      <PageHeader titulo="Mi marca" descripcion="Tus datos en cotizaciones, fichas e informes. A la derecha ves cómo quedan mientras escribes." />
      <FormularioMarca perfil={perfil} />
    </div>
  );
}
