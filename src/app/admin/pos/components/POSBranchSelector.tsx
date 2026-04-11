"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranch } from "@/hooks/useBranch";

interface POSBranchSelectorProps {
  /**
   * Callback cuando se selecciona una sucursal
   */
  onBranchSelected?: () => void;
  /**
   * Si se debe mostrar como alerta (true) o como selector normal (false)
   * Por defecto: true para super admins en modo global
   */
  showAsAlert?: boolean;
}

/**
 * Componente para seleccionar sucursal en el POS.
 * Muestra una alerta prominente para super admins en modo global,
 * o un selector normal cuando ya hay sucursal seleccionada.
 */
export function POSBranchSelector({
  onBranchSelected,
  showAsAlert = true,
}: POSBranchSelectorProps) {
  const {
    currentBranchId,
    currentBranchName,
    branches,
    isSuperAdmin,
    setCurrentBranch,
    isLoading,
  } = useBranch();

  // No mostrar nada si no es super admin (ellos siempre tienen sucursal)
  if (!isSuperAdmin) {
    return null;
  }

  // Si ya hay sucursal seleccionada, mostrar selector normal (opcional)
  if (currentBranchId && !showAsAlert) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Sucursal:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-1" size="sm" variant="outline">
              {currentBranchName}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {branches.map((branch) => (
              <DropdownMenuItem
                key={branch.id}
                onClick={() => {
                  setCurrentBranch(branch.id);
                  toast.success(`Sucursal cambiada a: ${branch.name}`);
                  onBranchSelected?.();
                }}
              >
                {branch.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Modo global (sin sucursal seleccionada) - mostrar alerta prominente
  if (!currentBranchId && showAsAlert) {
    return (
      <Alert className="mb-4 border-2" variant="destructive">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-bold">
          Selecciona una sucursal para habilitar la caja
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            Como super administrador, estás en <strong>modo global</strong>.
            Para realizar ventas en el POS, debes seleccionar una sucursal
            específica.
          </p>
          <div className="flex flex-wrap gap-2">
            {isLoading ? (
              <Button disabled size="sm">
                Cargando sucursales...
              </Button>
            ) : (
              branches.map((branch) => (
                <Button
                  key={branch.id}
                  size="sm"
                  onClick={() => {
                    setCurrentBranch(branch.id);
                    toast.success(`Sucursal seleccionada: ${branch.name}`);
                    onBranchSelected?.();
                  }}
                >
                  {branch.name}
                </Button>
              ))
            )}
          </div>
          <p className="text-xs text-gray-600">
            La selección de sucursal afecta: inventario, caja, y reportes de
            ventas.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
