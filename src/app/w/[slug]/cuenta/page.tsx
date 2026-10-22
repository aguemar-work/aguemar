import type { Metadata } from "next";
import { PageHeader } from "@/components/panel/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { obtenerUsuario } from "@/lib/insforge/server";
import { ws } from "@/lib/datos/workspace";
import { AvisosCorreo } from "./avisos-correo";
import { CambiarContrasena } from "./cambiar-contrasena";

export const metadata: Metadata = { title: "Mi cuenta" };

/** Mi cuenta (T-34): con qué correo entras, tu contraseña y si te escribimos avisos por correo. */
export default async function CuentaWorkspace({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [usuario, empresa, preferencias] = await Promise.all([obtenerUsuario(), ws.miEmpresa(), ws.preferencias()]);

  return (
    <>
      <PageHeader codigo="09" titulo="Mi cuenta" descripcion="Tu acceso, tu contraseña y los avisos que te llegan." />
      <div className="mx-auto grid max-w-3xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tu acceso</CardTitle>
            <CardDescription>Con este correo entras a tu espacio. Si necesitas cambiarlo, escríbenos.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Correo</dt>
                <dd className="font-mono">{usuario?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Empresa</dt>
                <dd>{empresa?.nombre ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contraseña</CardTitle>
            <CardDescription>Te enviamos un código de 6 dígitos a tu correo y con él defines la contraseña nueva.</CardDescription>
          </CardHeader>
          <CardContent>
            <CambiarContrasena slug={slug} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avisos por correo</CardTitle>
            <CardDescription>
              Documentos nuevos, respuestas a tus comentarios y recordatorios de pago. Si los apagas, todo sigue disponible aquí en tu espacio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AvisosCorreo slug={slug} activos={preferencias?.avisos_correo ?? true} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
