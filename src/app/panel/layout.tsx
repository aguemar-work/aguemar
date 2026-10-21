import type { Metadata } from "next";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { Avisos } from "@/components/avisos";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/panel/sidebar";
import { Topbar } from "@/components/panel/topbar";
import { AvisoBackend } from "@/components/panel/aviso-backend";
import { esEquipo, obtenerRol, rutaInicio } from "@/lib/insforge/server";
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
    if (!esEquipo(rol)) redirect(rutaInicio(rol));
  }
  const rolPanel = rol.tipo === "colaborador" ? "colaborador" : "propietario";

  return (
    <>
      <div className="flex min-h-dvh">
        <SaltarContenido />
        <Avisos />
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 md:block">
          <Sidebar rol={rolPanel} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar correo={usuario?.email} cerrarSesion={cerrarSesion} rol={rolPanel} />
          <main id="contenido" className="flex-1 p-4 md:p-6 lg:p-8">
            {!backendConfigurado ? (
              <div className="mb-6">
                <AvisoBackend />
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
      {/*
        Panel lateral de las rutas interceptadas (@modal): crear, editar y ver sin salir de la lista.
        Va fuera del <div> a propósito. En desarrollo, el elemento de este slot llega en el payload RSC
        con referencias que pueden seguir bloqueadas al hidratar (props deduplicadas contra el slot
        children, que comparte error.tsx, y su pila de depuración); React lo trata como "lazy" y, si
        suspende siendo hijo directo de un elemento ya hidratado, reintenta ese elemento sin
        restaurar el cursor de hidratación: "Hydration failed" en todo /panel (se esperaba el <div> y
        llegaba el <a> de SaltarContenido). El Sheet usa un portal, así que su sitio en el DOM no se ve.
      */}
      {modal}
    </>
  );
}
