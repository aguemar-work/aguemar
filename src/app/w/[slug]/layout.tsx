import type { Metadata } from "next";
import { SaltarContenido } from "@/components/ui/saltar-contenido";
import { Avisos } from "@/components/avisos";
import { Suspense } from "react";
import { BarraProgreso } from "@/components/barra-progreso";
import { notFound, redirect } from "next/navigation";
import { NavWorkspace } from "@/components/workspace/nav-workspace";
import { TopbarWorkspace } from "@/components/workspace/topbar-workspace";
import { obtenerRol, rutaInicio } from "@/lib/insforge/server";
import { ws } from "@/lib/datos/workspace";
import { cerrarSesion } from "@/app/(auth)/acciones";
import { after } from "next/server";
import { fechaLima, hoyLima } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export default async function WorkspaceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rol = await obtenerRol();
  if (rol.tipo === "anonimo") redirect(`/login?siguiente=/w/${slug}`);
  if (rol.tipo !== "empresa") redirect(rutaInicio(rol));
  if (rol.slug !== slug) redirect(`/w/${rol.slug}`);

  const empresa = await ws.miEmpresa();
  if (!empresa) notFound();
  // Último ingreso (HU 2.1): como mucho una escritura al día, después de responder.
  if (!empresa.ultimo_ingreso || fechaLima(empresa.ultimo_ingreso) !== hoyLima()) after(await ws.prepararIngreso());

  return (
    <div className="flex min-h-dvh">
      <SaltarContenido />
      <Avisos />
      <Suspense>
        <BarraProgreso />
      </Suspense>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 md:block">
        <NavWorkspace slug={slug} nombreEmpresa={empresa.nombre} modulos={empresa.modulos} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopbarWorkspace slug={slug} nombreEmpresa={empresa.nombre} modulos={empresa.modulos} correo={rol.usuario.email} cerrarSesion={cerrarSesion} />
        <main id="contenido" className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
