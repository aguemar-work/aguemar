import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Inbox } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { listarLeads } from "@/lib/datos/leads";
import { obtenerPerfilMarca } from "@/lib/datos/marca";
import { cn } from "@/lib/utils";
import type { EstadoLead } from "@/types/database";
import { TarjetaLead } from "./tarjeta-lead";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Leads" };

const PESTANAS: { valor: "" | EstadoLead; etiqueta: string }[] = [
  { valor: "nuevo", etiqueta: "Nuevos" },
  { valor: "contactado", etiqueta: "Contactados" },
  { valor: "convertido", etiqueta: "Convertidos" },
  { valor: "", etiqueta: "Todos" },
];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const { estado: param } = await searchParams;
  // Por defecto, los nuevos; "todos" muestra todo.
  const estado: "" | EstadoLead = param === "todos" ? "" : param === "contactado" || param === "convertido" ? param : "nuevo";
  const [{ leads, conteo }, marca] = await Promise.all([listarLeads(estado || undefined), obtenerPerfilMarca()]);
  const total = conteo.nuevo + conteo.contactado + conteo.convertido;

  return (
    <>
      <PageHeader
        codigo="06"
        titulo="Leads"
        descripcion="Mensajes del formulario de contacto de la landing. Respóndelos por WhatsApp o correo y conviértelos en empresa cuando empiecen a trabajar contigo."
        acciones={
          <Button asChild variant="outline">
            <a href="/#contacto" target="_blank" rel="noopener">
              <ExternalLink /> Ver la landing
            </a>
          </Button>
        }
      />
      <nav aria-label="Estado" className="mb-4 flex flex-wrap gap-1.5">
        {PESTANAS.map((p) => {
          const activo = estado === p.valor;
          const n = p.valor ? conteo[p.valor] : total;
          return (
            <Link
              key={p.etiqueta}
              href={p.valor === "nuevo" ? "/panel/leads" : `/panel/leads?estado=${p.valor || "todos"}`}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                activo ? "border-transparent bg-ink text-white dark:bg-mint dark:text-ink" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.etiqueta} <span className="font-mono">{n}</span>
            </Link>
          );
        })}
      </nav>
      {leads.length === 0 ? (
        <EmptyState
          icono={Inbox}
          titulo={total === 0 ? "Sin mensajes todavía." : "Nada en esta pestaña."}
          descripcion={total === 0 ? "Cuando alguien escriba desde el formulario de la landing, lo verás aquí y en tu inicio." : "Revisa las otras pestañas."}
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <TarjetaLead key={l.id} l={l} responsable={marca?.responsable ?? "Alejandro"} />
          ))}
        </ul>
      )}
    </>
  );
}
