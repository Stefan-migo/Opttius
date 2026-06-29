"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SystemHeaderProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export function SystemHeader({ refreshing, onRefresh }: SystemHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <h1
        className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-epoch-primary tracking-tight"
        data-tour="system-header"
      >
        Administración del Sistema
      </h1>
      <p className="text-sm sm:text-base text-epoch-primary/80 max-w-2xl">
        Configuración, monitoreo y mantenimiento del sistema de gestión óptica
      </p>
      <div className="flex justify-start sm:justify-end">
        <Button
          className="rounded-xl border-epoch-primary/20 min-h-[44px] w-full sm:w-auto"
          disabled={refreshing}
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 shrink-0 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar Estado
        </Button>
      </div>
    </div>
  );
}
