"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ExternalLink, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { TIPOS_ENTREGABLE } from "@/lib/areas";
import { entregableSchema, type EntregableDatos, type EntregableInput } from "@/lib/validators/trabajo";
import type { TrabajoEntregableRow } from "@/types/database";
import { eliminarEntregable, guardarEntregable } from "../acciones";

export function Entregables({ trabajoId, entregables }: { trabajoId: string; entregables: TrabajoEntregableRow[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<TrabajoEntregableRow | "nuevo" | null>(null);
  const [pendiente, iniciar] = useTransition();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Entregables</CardTitle>
          <CardDescription>Lo que el cliente recibe: enlaces a diseños, repositorios, accesos o archivos.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditando("nuevo")}>
          <Plus /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {entregables.length === 0 ? (
          <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Package className="size-5 shrink-0" aria-hidden />
            Sin entregables aún. Agrega el primero cuando tengas algo que mostrar.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {entregables.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <Badge variant="outline">{TIPOS_ENTREGABLE.find((t) => t.valor === e.tipo)?.etiqueta ?? e.tipo}</Badge>
                <div className="min-w-0 flex-1">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline">
                      {e.nombre} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <p className="text-sm font-medium">{e.nombre}</p>
                  )}
                  {e.nota ? <p className="truncate text-xs text-muted-foreground">{e.nota}</p> : null}
                </div>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${e.nombre}`} onClick={() => setEditando(e)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Eliminar ${e.nombre}`}
                  disabled={pendiente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await eliminarEntregable(e.id, trabajoId);
                      if (!r.ok) toast.error(r.error);
                      router.refresh();
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editando !== null} onOpenChange={(o) => (!o ? setEditando(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando === "nuevo" ? "Nuevo entregable" : "Editar entregable"}</DialogTitle>
            <DialogDescription>Nombre, tipo y, si aplica, el enlace.</DialogDescription>
          </DialogHeader>
          {editando !== null ? (
            <FormularioEntregable
              key={editando === "nuevo" ? "nuevo" : editando.id}
              trabajoId={trabajoId}
              entregable={editando === "nuevo" ? undefined : editando}
              onListo={() => setEditando(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FormularioEntregable({ trabajoId, entregable, onListo }: { trabajoId: string; entregable?: TrabajoEntregableRow; onListo: () => void }) {
  const router = useRouter();
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const form = useForm<EntregableInput, unknown, EntregableDatos>({
    resolver: zodResolver(entregableSchema),
    defaultValues: {
      nombre: entregable?.nombre ?? "",
      tipo: entregable?.tipo ?? "enlace",
      url: entregable?.url ?? "",
      nota: entregable?.nota ?? "",
    },
  });
  const { register, handleSubmit, formState, setError } = form;
  const errores = formState.errors;

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarEntregable(trabajoId, datos, entregable?.id);
      if (!r.ok) {
        if (r.campo && r.campo in datos) setError(r.campo as keyof EntregableInput, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success(entregable ? "Entregable actualizado." : "Entregable agregado.");
      onListo();
      router.refresh();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Campo id="e-nombre" etiqueta="Nombre" requerido error={errores.nombre?.message}>
        <Input {...register("nombre")} {...propsCampo("e-nombre", errores.nombre?.message)} autoFocus placeholder="Mockups en Figma" />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Campo id="e-tipo" etiqueta="Tipo" error={errores.tipo?.message}>
          <Select {...register("tipo")} {...propsCampo("e-tipo", errores.tipo?.message)}>
            {TIPOS_ENTREGABLE.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo id="e-url" etiqueta="Enlace" error={errores.url?.message}>
          <Input {...register("url")} {...propsCampo("e-url", errores.url?.message)} type="url" inputMode="url" placeholder="https://" className="font-mono text-xs" />
        </Campo>
      </div>
      <Campo id="e-nota" etiqueta="Nota" error={errores.nota?.message}>
        <Input {...register("nota")} {...propsCampo("e-nota", errores.nota?.message)} placeholder="Versión final aprobada el 12/10" />
      </Campo>
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger">
          {errorGeneral}
        </p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" variant="mint" disabled={guardando}>
          {guardando ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {entregable ? "Guardar" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
