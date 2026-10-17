import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { PestanasAjustes } from "@/components/panel/pestanas-ajustes";
import { EmptyState } from "@/components/panel/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvitacionPendiente } from "@/components/panel/invitacion-pendiente";
import { soloPropietario } from "@/lib/datos/base";
import { listarEquipo } from "@/lib/datos/equipo";
import { opcionesClientes } from "@/lib/datos/clientes";
import { InvitarColaborador, TarjetaColaborador } from "./formularios";

export const metadata: Metadata = { title: "Equipo" };

/** Equipo: quienes te apoyan, con las empresas que trabajan. Solo el propietario. */
export default async function EquipoPage() {
  await soloPropietario();
  const [{ colaboradores, invitaciones }, empresas] = await Promise.all([listarEquipo(), opcionesClientes()]);
  const nombreEmpresa = new Map(empresas.map((e) => [e.id, e.nombre]));

  return (
    <>
      <PestanasAjustes actual="/panel/equipo" />
      <PageHeader
        titulo="Equipo"
        descripcion="Quienes te apoyan. Cada colaborador ve solo las empresas que le asignes: trabajos, actividades, fichas, informes y documentos. Nunca dinero, leads ni Mi marca."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitar a alguien</CardTitle>
            <CardDescription>Le llega un enlace para crear su contraseña. Vence en 7 días.</CardDescription>
          </CardHeader>
          <CardContent>
            {empresas.length ? (
              <InvitarColaborador empresas={empresas} />
            ) : (
              <p className="text-sm text-muted-foreground">Primero registra una empresa: el colaborador necesita al menos una asignada.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {invitaciones.length ? (
            <section aria-labelledby="t-pendientes" className="space-y-3">
              <h2 id="t-pendientes" className="text-base font-semibold">
                Invitaciones pendientes
              </h2>
              {invitaciones.map((i) => (
                <div key={i.id} className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{i.nombre ?? i.correo}</span>
                    <span className="text-muted-foreground"> · {i.empresas.map((id) => nombreEmpresa.get(id) ?? "—").join(", ")}</span>
                  </p>
                  <InvitacionPendiente id={i.id} token={i.token} correo={i.correo} expiraEn={i.expira_en} tipo="colaborador" ruta="/panel/equipo" />
                </div>
              ))}
            </section>
          ) : null}

          <section aria-labelledby="t-equipo" className="space-y-3">
            <h2 id="t-equipo" className="text-base font-semibold">
              Colaboradores <span className="font-mono text-sm text-muted-foreground">({colaboradores.length})</span>
            </h2>
            {colaboradores.length ? (
              colaboradores.map((c) => <TarjetaColaborador key={c.user_id} colaborador={c} empresas={empresas} />)
            ) : (
              <EmptyState icono={UsersRound} titulo="Aún no tienes equipo." descripcion="Invita a quien te apoya y asígnale las empresas que va a trabajar." />
            )}
          </section>
        </div>
      </div>
    </>
  );
}
