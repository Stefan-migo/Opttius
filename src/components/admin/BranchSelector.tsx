"use client";

import { useState } from "react";
import { useBranch } from "@/hooks/useBranch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function BranchSelector() {
  const {
    branches,
    currentBranch,
    isGlobalView,
    isSuperAdmin,
    isLoading,
    setCurrentBranch,
  } = useBranch();

  const [isChanging, setIsChanging] = useState(false);

  const handleBranchChange = async (value: string) => {
    setIsChanging(true);
    try {
      await setCurrentBranch(value === "global" ? "global" : value);
    } catch (error) {
      console.error("Error changing branch:", error);
    } finally {
      setIsChanging(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-2 py-2 max-md:px-1">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="text-sm text-muted-foreground max-md:hidden">
          Cargando...
        </span>
      </div>
    );
  }

  if (branches.length === 0) {
    return null;
  }

  const currentValue = isGlobalView ? "global" : currentBranch?.id || "";

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={currentValue}
        onValueChange={handleBranchChange}
        disabled={isChanging}
      >
        <SelectTrigger
          className={cn(
            "min-w-0 flex-shrink border-admin-border",
            "w-[200px] md:min-w-[140px]",
            "max-md:w-10 max-md:px-2 max-md:justify-center max-md:[&>:last-child]:hidden",
            isChanging && "opacity-50",
          )}
        >
          <SelectValue placeholder="Seleccionar sucursal">
            <div className="flex items-center space-x-2">
              {isGlobalView ? (
                <>
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="max-md:sr-only">Vista Global</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="max-md:sr-only">
                    {currentBranch?.name || "Sin sucursal"}
                  </span>
                </>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {isSuperAdmin && (
            <SelectItem value="global">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4" />
                <span>Vista Global</span>
              </div>
            </SelectItem>
          )}
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4" />
                <span>{branch.name}</span>
                {branch.is_primary && (
                  <span className="text-xs text-muted-foreground">
                    (Principal)
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
