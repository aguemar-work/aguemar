import type { Metadata } from "next";
import Link from "next/link";
import { Laptop, Plus } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Buscador } from "@/components/panel/buscador";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarEquipos } from "@/lib/datos/equipos";
import { opcionesClientes } from "@/lib/datos/clientes";

export const metadata: Metadata = { title: "Equipos" };

interface Props {
  searchParams: Promise<{ q?: string; cliente?: string }>;
}

export default async function EquiposPage({ searchParams }: Props) {
  const { q, cliente } = await searchParams;
  const [equipos, clientes] = await Promise.all([listarEquipos({ busqueda: q, clienteId: cliente }), opcionesClientes()]);
  const clienteFiltro = clientes.find((c) => c.id === cliente);

  return (
    <>
      <PageHeader
        codigo="02"
        titulo="Equipos"
        descripcion="Cada equipo pertenece a un cliente y guarda su historial de fichas."
        acciones={
          <Button asChild variant="mint" disabled={clientes.length === 0}>
            <Link href={cliente ? `/panel/equipos/nuevo?cliente=${cliente}` : "/panel/equipos/nuevo"}>
              <Plus /> Nuevo equipo
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Buscador placeholder="Buscar por serie, marca o modelo" valorInicial={q} ocultos={{ cliente }} />
        {clienteFiltro ? (
          <Badge variant="outline">
            Cliente: {clienteFiltro.nombre}
            <Link href="/panel/equipos" className="ml-1 underline-offset-4 hover:underline" aria-label="Quitar filtro de cliente">
              ×
            </Link>
          </Badge>
        ) : null}
      </div>

      {equipos.length === 0 ? (
        <EmptyState
          icono={Laptop}
          titulo={q || cliente ? "Sin equipos para ese filtro." : "Aún no hay equipos."}
          descripcion={
            clientes.length === 0
              ? "Primero crea un cliente; luego registra sus equipos."
              : "Registra la laptop o PC que atiendes para llevar su historial de fichas."
          }
          accion={
            clientes.length === 0 ? (
              <Button asChild variant="mint">
                <Link href="/panel/clientes/nuevo">
                  <Plus /> Nuevo cliente
                </Link>
              </Button>
            ) : (
              <Button asChild variant="mint">
                <Link href="/panel/equipos/nuevo">
                  <Plus /> Nuevo equipo
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Sistema</TableHead>
              <TableHead className="text-right">Fichas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipos.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/panel/equipos/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                    {[e.marca, e.modelo].filter(Boolean).join(" ") || "Equipo sin nombre"}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="mono">{e.serie}</Badge>
                </TableCell>
                <TableCell>
                  {e.clientes ? (
                    <Link href={`/panel/clientes/${e.clientes.id}`} className="underline-offset-4 hover:underline">
                      {e.clientes.nombre}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{e.sistema_operativo ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular">{e.fichas?.[0]?.count ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
