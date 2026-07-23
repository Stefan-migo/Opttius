"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SystemConfigFiltersProps {
  hasMultipleBranches: boolean;
  configScope: "global" | "branch";
  onConfigScopeChange?: (scope: "global" | "branch") => void;
  categoryFilter: string;
  uniqueCategories: string[];
  categoryNames: Record<string, string>;
  onCategoryFilterChange: (v: string) => void;
  showSensitive: boolean;
  onToggleSensitive: () => void;
}

export default function SystemConfigFilters({
  hasMultipleBranches,
  configScope,
  onConfigScopeChange,
  categoryFilter,
  uniqueCategories,
  categoryNames,
  onCategoryFilterChange,
  showSensitive,
  onToggleSensitive,
}: SystemConfigFiltersProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          {hasMultipleBranches && onConfigScopeChange && (
            <div className="w-full md:w-auto min-w-0">
              <Label className="text-xs sm:text-sm font-medium mb-2 block">
                Aplicar a
              </Label>
              <Select
                value={configScope}
                onValueChange={(v) =>
                  onConfigScopeChange(v as "global" | "branch")
                }
              >
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Todas las sucursales</SelectItem>
                  <SelectItem value="branch">Sucursal actual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex-1 w-full md:min-w-0 min-w-0">
            <Label className="text-xs sm:text-sm font-medium mb-2 block">
              Filtrar por Categoría
            </Label>
            <Select
              value={categoryFilter}
              onValueChange={onCategoryFilterChange}
            >
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {categoryNames[category] ||
                      category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-auto min-w-0 shrink-0">
            <Label className="text-xs sm:text-sm font-medium mb-2 block">
              Opciones
            </Label>
            <Button
              className="w-full md:w-auto rounded-xl border-epoch-primary/20 min-h-[44px] text-left justify-center sm:justify-center overflow-hidden"
              variant="outline"
              onClick={onToggleSensitive}
            >
              {showSensitive ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Ocultar Sensibles</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Mostrar Sensibles</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
