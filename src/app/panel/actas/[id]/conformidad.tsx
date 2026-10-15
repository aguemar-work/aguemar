"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Campo } from "@/components/formulario/campo";
import { aceptarActa } from "@/app/panel/documentos/acciones";

/** Registrar la conformidad desde el panel (p. ej. el acta se firmó en papel o la confirmaron por teléfono). */
export function RegistrarConformidad({ id, contacto }: { id: string; contacto: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(contacto ?? "");
  const [dni, setDni] = useState("");
  const [error, setError] = useState<string>();
  const [pendiente, iniciar] = useTransition();

  const confirmar = () =>
    iniciar(async () => {
      setError(undefined);
      const r = await aceptarActa(id, { nombre, dni });
      if (!r.ok) return setError(r.error);
      toast.success("Conformidad registrada. El trabajo pasó a entregado.");
      setAbierto(false);
    });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Check /> Registrar conformidad
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar conformidad</DialogTitle>
          <DialogDescription>Úsalo si la firmaron en papel o te confirmaron por otro medio. Si la empresa tiene workspace, puede aceptarla ella misma.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <Campo id="conf-nombre" etiqueta="Quién recibe" requerido>
            <Input id="conf-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </Campo>
          <Campo id="conf-dni" etiqueta="DNI" ayuda="Opcional">
            <Input id="conf-dni" value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" className="font-mono" />
          </Campo>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button variant="mint" onClick={confirmar} disabled={pendiente || nombre.trim().length < 2}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Check />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
