"use client";

import { useState } from "react";
import { Menu, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sidebar } from "./sidebar";
import type { RolPanel } from "./nav";
import { ThemeToggle } from "./theme-toggle";

interface TopbarProps {
  correo?: string | null;
  rol?: RolPanel;
  cerrarSesion: () => Promise<void>;
}

export function Topbar({ correo, cerrarSesion, rol = "propietario" }: TopbarProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Menú del panel</SheetTitle>
          <Sidebar rol={rol} onNavegar={() => setAbierto(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Cuenta">
            <UserRound className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="truncate font-mono">{correo ?? "Sin sesión"}</DropdownMenuLabel>
          {rol === "colaborador" ? <p className="px-2 pb-1.5 text-xs text-muted-foreground">Colaborador del equipo</p> : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void cerrarSesion()}>
            <LogOut /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
