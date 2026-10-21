"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/panel/empty-state";
import { ConfirmarEliminar } from "@/components/panel/confirmar-eliminar";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { formatearCentimos, formatearMonto } from "@/lib/format";
import { AREAS } from "@/lib/areas";
import { EtiquetaArea } from "@/components/panel/etiqueta-area";
import { servicioSchema, type ServicioDatos, type ServicioInput } from "@/lib/validators/servicio";
import type { ServicioRow } from "@/types/database";
import { cambiarVisibilidadServicio, eliminarServicio, guardarServicio, reordenarServicios } from "./acciones";

interface Props {
  servicios: ServicioRow[];
}

export function ListaServicios({ servicios }: Props) {
  const [editando, setEditando] = useState<ServicioRow | null | "nuevo">(null);
  const [pendiente, iniciar] = useTransition();

  const mover = (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion;
    if (destino < 0 || destino >= servicios.length) return;
    const ids = servicios.map((s) => s.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    iniciar(async () => {
      const r = await reordenarServicios(ids);
      if (!r.ok) toast.error(r.error);
    });
  };

  const alternarVisible = (s: ServicioRow) =>
    iniciar(async () => {
      const r = await cambiarVisibilidadServicio(s.id, !s.visible_landing);
      if (!r.ok) toast.error(r.error);
      else toast.success(!s.visible_landing ? "Visible en la landing." : "Oculto en la landing.");
    });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button variant="mint" onClick={() => setEditando("nuevo")}>
          <Plus /> Nuevo servicio
        </Button>
      </div>

      {servicios.length === 0 ? (
        <EmptyState
          icono={Wrench}
          titulo="Aún no hay servicios."
          descripcion="Agrega tu primer servicio con su precio base. Alimenta la landing y las cotizaciones."
          accion={
            <Button variant="mint" onClick={() => setEditando("nuevo")}>
              <Plus /> Nuevo servicio
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="text-right">Precio desde</TableHead>
              <TableHead className="hidden sm:table-cell">Unidad</TableHead>
              <TableHead>En landing</TableHead>
              <TableHead className="w-24 text-right">
                <span className="sr-only">Acciones</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicios.map((s, i) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Subir ${s.nombre}`} disabled={i === 0 || pendiente} onClick={() => mover(i, -1)}>
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" aria-label={`Bajar ${s.nombre}`} disabled={i === servicios.length - 1 || pendiente} onClick={() => mover(i, 1)}>
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <EtiquetaArea area={s.area} />
                  <p className="font-medium">{s.nombre}</p>
                  {s.descripcion ? <p className="line-clamp-1 max-w-md text-xs text-muted-foreground">{s.descripcion}</p> : null}
                </TableCell>
                <TableCell className="text-right font-mono tabular">
                  {s.precio_base === null ? <span className="text-xs text-muted-foreground">A cotizar</span> : formatearMonto(s.precio_base)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{s.unidad}</Badge>
                </TableCell>
                <TableCell>
                  <Switch checked={s.visible_landing} onCheckedChange={() => alternarVisible(s)} disabled={pendiente} aria-label={`Mostrar ${s.nombre} en la landing`} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Editar ${s.nombre}`} onClick={() => setEditando(s)}>
                      <Pencil />
                    </Button>
                    <ConfirmarEliminar
                      titulo={`¿Eliminar "${s.nombre}"?`}
                      descripcion="Las cotizaciones que lo usan conservan su descripción y precio; solo pierden el vínculo con el catálogo."
                      accion={eliminarServicio.bind(null, s.id)}
                      textoExito="Servicio eliminado."
                      variant="ghost"
                      size="icon"
                    >
                      <Trash2 />
                    </ConfirmarEliminar>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DialogoServicio
        abierto={editando !== null}
        servicio={editando === "nuevo" ? undefined : (editando ?? undefined)}
        onCerrar={() => setEditando(null)}
      />
    </>
  );
}

function DialogoServicio({ abierto, servicio, onCerrar }: { abierto: boolean; servicio?: ServicioRow; onCerrar: () => void }) {
  return (
    <Dialog open={abierto} onOpenChange={(o) => (!o ? onCerrar() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{servicio ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>Se muestra en la landing y se puede elegir al cotizar.</DialogDescription>
        </DialogHeader>
        {abierto ? <FormularioServicio key={servicio?.id ?? "nuevo"} servicio={servicio} onListo={onCerrar} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioServicio({ servicio, onListo }: { servicio?: ServicioRow; onListo: () => void }) {
  const [guardando, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const form = useForm<ServicioInput, unknown, ServicioDatos>({
    resolver: zodResolver(servicioSchema),
    defaultValues: {
      area: servicio?.area ?? "soporte",
      nombre: servicio?.nombre ?? "",
      descripcion: servicio?.descripcion ?? "",
      precio_base_texto: servicio?.precio_base != null ? formatearCentimos(servicio.precio_base).replace(/\s/g, "") : "",
      unidad: servicio?.unidad ?? "servicio",
      visible_landing: servicio?.visible_landing ?? true,
    },
  });
  const { register, handleSubmit, formState, setError, watch, setValue } = form;
  const errores = formState.errors;
  const visible = watch("visible_landing");

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await guardarServicio(datos, servicio?.id);
      if (!r.ok) {
        if (r.campo && r.campo in datos) setError(r.campo as keyof ServicioInput, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success(servicio ? "Servicio actualizado." : "Servicio creado.");
      onListo();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Campo id="s-area" etiqueta="Área" requerido error={errores.area?.message}>
        <Select {...register("area")} {...propsCampo("s-area", errores.area?.message)}>
          {AREAS.map((a) => (
            <option key={a.valor} value={a.valor}>
              {a.etiqueta}
            </option>
          ))}
        </Select>
      </Campo>
      <Campo id="s-nombre" etiqueta="Nombre" requerido error={errores.nombre?.message}>
        <Input {...register("nombre")} {...propsCampo("s-nombre", errores.nombre?.message)} autoFocus placeholder="Mantenimiento preventivo" />
      </Campo>
      <Campo id="s-descripcion" etiqueta="Descripción" error={errores.descripcion?.message} ayuda="Una o dos líneas; es lo que ve el cliente en la landing.">
        <Textarea {...register("descripcion")} {...propsCampo("s-descripcion", errores.descripcion?.message, "si")} rows={3} />
      </Campo>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="s-precio" etiqueta="Precio desde (S/)" error={errores.precio_base_texto?.message} ayuda="Vacío = sin precio público.">
          <Input {...register("precio_base_texto")} {...propsCampo("s-precio", errores.precio_base_texto?.message, "si")} inputMode="decimal" placeholder="120,00" className="font-mono" />
        </Campo>
        <Campo id="s-unidad" etiqueta="Unidad" requerido error={errores.unidad?.message}>
          <Input {...register("unidad")} {...propsCampo("s-unidad", errores.unidad?.message)} placeholder="equipo, hora, servicio" />
        </Campo>
      </div>
      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <p className="text-sm font-medium">Mostrar en la landing</p>
          <p className="text-xs text-muted-foreground">Los servicios ocultos siguen disponibles al cotizar.</p>
        </div>
        <Switch checked={visible} onCheckedChange={(v) => setValue("visible_landing", v, { shouldDirty: true })} aria-label="Mostrar en la landing" />
      </div>
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
          {servicio ? "Guardar cambios" : "Crear servicio"}
        </Button>
      </DialogFooter>
    </form>
  );
}
