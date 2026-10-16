import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/panel/page-header";
import { EmptyState } from "@/components/panel/empty-state";
import { Buscador } from "@/components/panel/buscador";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarClientes } from "@/lib/datos/clientes";
import { soloPropietario } from "@/lib/datos/base";

export const metadata: Metadata = { title: "Empresas" };

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function ClientesPage({ searchParams }: Props) {
  // Solo el propietario (el colaborador recibe 404).
  await soloPropietario();
  const { q } = await searchParams;
  const clientes = await listarClientes(q);

  return (
    <>
      <PageHeader
        codigo="01"
        titulo="Empresas"
        descripcion="Las empresas y personas que atiendes. Cada una puede tener su workspace."
        acciones={
          <Button asChild variant="mint">
            <Link href="/panel/clientes/nuevo">
              <Plus /> Nueva empresa
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <Buscador placeholder="Buscar por nombre, documento o contacto" valorInicial={q} />
      </div>

      {clientes.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo={q ? `Sin resultados para "${q}".` : "Aún no hay empresas."}
          descripcion={q ? "Prueba con otro término o crea la empresa." : "Crea la primera para planificar trabajos y darle su workspace."}
          accion={
            <Button asChild variant="mint">
              <Link href="/panel/clientes/nuevo">
                <Plus /> Nueva empresa
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Contacto</TableHead>
              <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
              <TableHead className="hidden md:table-cell">Workspace</TableHead>
              <TableHead className="text-right">Equipos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/panel/clientes/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.nombre}
                  </Link>
                  <p className="text-xs text-muted-foreground md:hidden">{c.contacto}</p>
                </TableCell>
                <TableCell>
                  {c.num_doc ? (
                    <Badge variant="mono">
                      {c.tipo_doc} {c.num_doc}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin documento</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">{c.contacto ?? "—"}</TableCell>
                <TableCell className="hidden font-mono text-xs lg:table-cell">{c.telefono ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {c.usuario_id ? (
                    <Badge variant="ok" dot>
                      Activo · {(c.modulos ?? []).length} módulos
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin acceso</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono tabular">{c.equipos?.[0]?.count ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
