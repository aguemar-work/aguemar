import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Brackets } from "@/components/brand/brackets";
import { Button } from "@/components/ui/button";
import { obtenerUsuario } from "@/lib/insforge/server";
import { salirYVolver, verInvitacion } from "./acciones";
import { AceptarConSesion, FormularioInvitacion } from "./formulario";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitación",
  robots: { index: false, follow: false },
};

const MOTIVO: Record<string, string> = {
  usada: "Esta invitación ya se usó. Si ya creaste tu contraseña, entra con ella.",
  vencida: "Esta invitación venció. Pide a aguemar un enlace nuevo.",
  revocada: "Esta invitación fue anulada. Pide a aguemar un enlace nuevo.",
};

export default async function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, usuario] = await Promise.all([verInvitacion(token), obtenerUsuario()]);
  const estudio = inv?.estudio ?? "aguemar";

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <Brackets className="pointer-events-none absolute -right-16 -top-16 h-80 w-auto opacity-[0.08]" color="#1CE783" />
      <div className="relative w-full max-w-sm space-y-6">
        <div>
          <Logo alto={32} priority className="dark:hidden" />
          <Logo variante="claro" alto={32} className="hidden dark:block" />
        </div>

        {!inv ? (
          <Mensaje titulo="Enlace no válido" texto="Revisa que el enlace esté completo o pide a aguemar uno nuevo." />
        ) : inv.estado !== "vigente" ? (
          <Mensaje titulo="Esta invitación no está disponible" texto={MOTIVO[inv.estado] ?? MOTIVO.vencida} />
        ) : (
          <>
            <div>
              <p className="font-mono text-xs text-mint-ink dark:text-mint">{inv.tipo === "empresa" ? "// tu espacio" : "// equipo"}</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {inv.tipo === "empresa" ? `Tu espacio${inv.empresa ? ` de ${inv.empresa}` : ""}` : `Únete al equipo de ${estudio}`}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {inv.tipo === "empresa"
                  ? "Desde aquí sigues el avance de tus proyectos, ves tus documentos y nos dejas comentarios."
                  : "Vas a trabajar los proyectos de las empresas que te asignaron: tareas, actividades, fichas e informes."}
              </p>
            </div>

            {usuario && usuario.email.toLowerCase() === inv.correo.toLowerCase() ? (
              <AceptarConSesion token={token} correo={inv.correo} />
            ) : usuario ? (
              <div className="space-y-3 rounded-md border border-border p-4 text-sm">
                <p>
                  Entraste como <span className="font-mono">{usuario.email}</span>, pero esta invitación es para{" "}
                  <span className="font-mono">{inv.correo}</span>.
                </p>
                <form action={salirYVolver.bind(null, token)}>
                  <Button type="submit" variant="outline">
                    Cerrar sesión y continuar
                  </Button>
                </form>
              </div>
            ) : (
              <FormularioInvitacion token={token} correo={inv.correo} />
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            Ir al sitio de {estudio}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Mensaje({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{"// invitación"}</p>
        <h1 className="mt-2 text-xl font-semibold">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/login">Ir a iniciar sesión</Link>
      </Button>
    </div>
  );
}
