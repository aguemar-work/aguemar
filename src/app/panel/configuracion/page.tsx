import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { listarPlantillas, obtenerPerfilMarca } from "@/lib/datos/marca";
import { FormularioMarca } from "./formulario-marca";
import { EditorPlantillas } from "./editor-plantillas";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Mi marca" };

export default async function ConfiguracionPage() {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const [perfil, plantillas] = await Promise.all([obtenerPerfilMarca(), listarPlantillas()]);

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <PageHeader codigo="07" titulo="Mi marca" descripcion="Tus datos en cotizaciones, fichas e informes. A la derecha ves cómo quedan mientras escribes." />
        <FormularioMarca perfil={perfil} />
      </div>
      <section id="plantillas" className="scroll-mt-20 lg:max-w-[calc(100%-352px)]">
        <EditorPlantillas plantillas={plantillas} />
      </section>
    </div>
  );
}
