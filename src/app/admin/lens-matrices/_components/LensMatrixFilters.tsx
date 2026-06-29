"use client";

import { Eye, EyeOff, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Family {
  id: string;
  name: string;
}

interface LensMatrixFiltersProps {
  searchTerm: string;
  selectedFamilyId: string;
  includeInactive: boolean;
  families: Family[];
  onSearchChange: (value: string) => void;
  onFamilyChange: (value: string) => void;
  onToggleInactive: () => void;
  onRefresh: () => void;
}

export function LensMatrixFilters({
  searchTerm,
  selectedFamilyId,
  includeInactive,
  families,
  onSearchChange,
  onFamilyChange,
  onToggleInactive,
  onRefresh,
}: LensMatrixFiltersProps) {
  return (
    <div className="mb-4 flex gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Buscar por familia, tipo o material..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>
      <div className="w-64">
        <Select value={selectedFamilyId} onValueChange={onFamilyChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por familia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {families.map((family) => (
              <SelectItem key={family.id} value={family.id}>
                {family.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button size="sm" variant="outline" onClick={onToggleInactive}>
        {includeInactive ? (
          <>
            <EyeOff className="h-4 w-4 mr-2" />
            Ocultar Inactivas
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Mostrar Inactivas
          </>
        )}
      </Button>
      <Button size="sm" variant="outline" onClick={onRefresh}>
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
