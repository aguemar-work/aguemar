"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { avisoError } from "@/lib/avisos";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Resultado } from "@/lib/datos/resultado";

interface ConfirmarEliminarProps {
  titulo: string;
  descripcion: string;
  /** Server Action que ejecuta el borrado. */
  accion: () => Promise<Resultado<unknown>>;
  /** Ruta a la que ir si el borrado fue exitoso. */
  irA?: string;
  textoExito?: string;
  children?: ReactNode;
  variant?: "ghost" | "outline" | "danger";
  size?: "sm" | "default" | "icon";
}

export function ConfirmarEliminar({
  titulo,
  descripcion,
  accion,
  irA,
  textoExito = "Eliminado.",
  children,
  variant = "outline",
  size = "default",
}: ConfirmarEliminarProps) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();

  const confirmar = () =>
    iniciar(async () => {
      const r = await accion();
      if (!r.ok) {
        avisoError(r.error);
        return;
      }
      toast.success(textoExito);
      setAbierto(false);
      if (irA) router.push(irA);
    });

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} aria-label={size === "icon" ? titulo : undefined}>
          {children ?? (
            <>
              <Trash2 /> Eliminar
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmar} disabled={pendiente}>
            {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            Sí, eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
