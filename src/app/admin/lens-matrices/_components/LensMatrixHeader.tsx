"use client";

import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface LensMatrixHeaderProps {
  onNew: () => void;
  onImport: () => void;
}

export function LensMatrixHeader({ onNew, onImport }: LensMatrixHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold">Matrices de Precios de Lentes</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las matrices de precios para calcular costos de lentes
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-2" />
          Importar CSV
        </Button>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Matriz
        </Button>
      </div>
    </div>
  );
}
