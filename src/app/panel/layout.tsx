import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { AvisoBackend } from "@/components/panel/aviso-backend";
import { obtenerRol, rutaInicio } from "@/lib/insforge/server";
import { backendConfigurado } from "@/lib/env";
import { cerrarSesion } from "@/app/(auth)/acciones";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const rol = await obtenerRol();
  const usuario = rol.tipo === "anonimo" ? null : rol.usuario;

  if (backendConfigurado) {
    if (rol.tipo === "anonimo") redirect("/login?siguiente=/panel");
    if (rol.tipo !== "propietario") redirect(rutaInicio(rol));
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 md:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar correo={usuario?.email} cerrarSesion={cerrarSesion} />
        <main id="contenido" className="flex-1 p-4 md:p-6 lg:p-8">
          {!backendConfigurado ? (
            <div className="mb-6">
              <AvisoBackend />
            </div>
          ) : null}
          {children}
        </main>
      </div>
      {/* Panel lateral de las rutas interceptadas (@modal): crear, editar y ver sin salir de la lista. */}
      {modal}
    </div>
  );
}
