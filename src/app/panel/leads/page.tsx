import type { Metadata } from "next";
import Link from "@/components/panel/enlace";
import { ExternalLink, Inbox } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Button } from "@/components/ui/button";
import { listarLeads, resumenEventos } from "@/lib/datos/leads";
import { ETIQUETA_ORIGEN } from "@/lib/origen";
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
  const [{ leads, conteo }, marca, eventos] = await Promise.all([listarLeads(estado || undefined), obtenerPerfilMarca(), resumenEventos(30)]);
  const total = conteo.nuevo + conteo.contactado + conteo.convertido;
  const contactos: [string, number][] = [
    ["Clics en WhatsApp", eventos.porEvento.whatsapp_click],
    ["Clics en correo", eventos.porEvento.correo_click],
    ["Formularios enviados", eventos.porEvento.contacto_enviado],
  ];

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
      <section aria-labelledby="t-contactos" className="mb-6 rounded-lg border border-border p-4">
        <h2 id="t-contactos" className="font-mono text-xs text-muted-foreground">
          {`// contactos desde la web · últimos ${eventos.dias} días`}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {contactos.map(([etiqueta, n]) => (
            <div key={etiqueta} className="flex flex-col-reverse justify-end">
              <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
              <dd className="font-mono text-2xl font-semibold tabular">{n}</dd>
            </div>
          ))}
        </dl>
        {eventos.porOrigen.length ? (
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Por origen:</span>
            {eventos.porOrigen.map((o) => (
              <span key={o.origen}>
                {ETIQUETA_ORIGEN[o.origen] ?? o.origen} <span className="font-mono text-foreground">{o.total}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Aún no hay clics registrados. Las visitas y su procedencia están en Vercel → Analytics.</p>
        )}
      </section>
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
