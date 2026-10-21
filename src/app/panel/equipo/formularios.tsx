"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Loader2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Campo, propsCampo } from "@/components/formulario/campo";
import { formatearFecha } from "@/lib/format";
import { invitarColaboradorSchema, type InvitarColaboradorInput } from "@/lib/validators/empresa";
import type { Colaborador } from "@/lib/datos/equipo";
import { actualizarColaborador, invitarColaborador } from "./acciones";

type Empresa = { id: string; nombre: string };

/** Casillas de empresas, con su leyenda para lectores de pantalla. */
function Empresas({ empresas, seleccion, onCambio, id, error }: { empresas: Empresa[]; seleccion: string[]; onCambio: (ids: string[]) => void; id: string; error?: string }) {
  return (
    <fieldset className="space-y-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-sm font-medium">
        Empresas que trabaja<span className="ml-0.5 text-danger" aria-hidden>*</span>
      </legend>
      <div className="grid max-h-56 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
        {empresas.map((e) => {
          const marcada = seleccion.includes(e.id);
          return (
            <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-soft dark:hover:bg-secondary">
              <input
                type="checkbox"
                className="size-4 accent-mint-ink dark:accent-mint"
                checked={marcada}
                onChange={(ev) => onCambio(ev.target.checked ? [...seleccion, e.id] : seleccion.filter((x) => x !== e.id))}
              />
              {e.nombre}
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function InvitarColaborador({ empresas }: { empresas: Empresa[] }) {
  const [pendiente, iniciar] = useTransition();
  const [errorGeneral, setErrorGeneral] = useState<string>();
  const { register, handleSubmit, formState, setError, setValue, watch, reset } = useForm<InvitarColaboradorInput>({
    resolver: zodResolver(invitarColaboradorSchema),
    defaultValues: { nombre: "", correo: "", empresas: [] },
  });
  const e = formState.errors;
  const seleccion = watch("empresas") ?? [];

  const onSubmit = handleSubmit((datos) =>
    iniciar(async () => {
      setErrorGeneral(undefined);
      const r = await invitarColaborador(datos);
      if (!r.ok) {
        if (r.campo === "nombre" || r.campo === "correo" || r.campo === "empresas") setError(r.campo, { message: r.error });
        else setErrorGeneral(r.error);
        return;
      }
      toast.success("Invitación lista. Cópiala o envíala por WhatsApp desde la lista.");
      reset();
    }),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="col-nombre" etiqueta="Nombre" requerido error={e.nombre?.message}>
          <Input {...register("nombre")} {...propsCampo("col-nombre", e.nombre?.message)} autoComplete="off" placeholder="Nombre y apellido" />
        </Campo>
        <Campo id="col-correo" etiqueta="Correo" requerido error={e.correo?.message}>
          <Input {...register("correo")} {...propsCampo("col-correo", e.correo?.message)} type="email" autoComplete="off" placeholder="persona@correo.com" />
        </Campo>
      </div>
      <Empresas id="col-empresas" empresas={empresas} seleccion={seleccion} onCambio={(ids) => setValue("empresas", ids, { shouldValidate: formState.isSubmitted, shouldDirty: true })} error={e.empresas?.message} />
      {errorGeneral ? (
        <p role="alert" className="text-sm text-danger">
          {errorGeneral}
        </p>
      ) : null}
      <Button type="submit" variant="mint" disabled={pendiente}>
        {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />} Invitar
      </Button>
    </form>
  );
}

export function TarjetaColaborador({ colaborador: c, empresas }: { colaborador: Colaborador; empresas: Empresa[] }) {
  const [pendiente, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [seleccion, setSeleccion] = useState<string[]>(c.empresas.map((x) => x.id));

  const guardar = (activo: boolean, ids: string[], mensaje: string) =>
    iniciar(async () => {
      const r = await actualizarColaborador(c.user_id, { activo, empresas: ids });
      if (!r.ok) return void avisoError(r.error);
      toast.success(mensaje);
      setEditando(false);
    });

  return (
    <article className={`space-y-3 rounded-lg border p-4 ${c.activo ? "border-border" : "border-dashed border-border opacity-80"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{c.nombre ?? c.correo}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{c.correo}</p>
          <p className="text-xs text-muted-foreground">En el equipo desde {formatearFecha(c.desde)}</p>
          {c.cuenta_previa ? (
            <p role="status" className="mt-2 rounded-md border border-border bg-warn-soft px-3 py-2 text-sm text-warn dark:bg-warning-bg dark:text-warning-foreground">
              Esta cuenta ya existía cuando se creó la invitación. Confirma con la persona que la creó ella: quien conociera el correo pudo registrarlo antes.
            </p>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Badge variant={c.activo ? "ok" : "outline"} dot>
            {c.activo ? "Activo" : "Desactivado"}
          </Badge>
          <Switch
            checked={c.activo}
            disabled={pendiente}
            aria-label={c.activo ? `Desactivar a ${c.nombre ?? c.correo}` : `Activar a ${c.nombre ?? c.correo}`}
            onCheckedChange={(v) => guardar(v, seleccion, v ? "Colaborador activo." : "Colaborador desactivado: ya no ve nada.")}
          />
        </label>
      </header>

      {editando ? (
        <div className="space-y-3">
          <Empresas id={`emp-${c.user_id}`} empresas={empresas} seleccion={seleccion} onCambio={setSeleccion} />
          <div className="flex gap-2">
            <Button size="sm" variant="mint" disabled={pendiente} onClick={() => guardar(c.activo, seleccion, "Empresas actualizadas.")}>
              {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />} Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSeleccion(c.empresas.map((x) => x.id));
                setEditando(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {c.empresas.length ? (
            c.empresas.map((e) => (
              <Badge key={e.id} variant="outline">
                {e.nombre}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Sin empresas asignadas.</span>
          )}
          <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
            Cambiar empresas
          </Button>
        </div>
      )}
    </article>
  );
}
