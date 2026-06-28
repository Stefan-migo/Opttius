"use client";

import { Play, Pause, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrgsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  tierFilter: string;
  onTierFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  selectedCount: number;
  onBulkAction: (
    action: "suspend" | "activate" | "change_tier",
    value?: string,
  ) => void;
  onClearSelection: () => void;
}

export default function OrgsFilters({
  searchTerm,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  statusFilter,
  onStatusFilterChange,
  selectedCount,
  onBulkAction,
  onClearSelection,
}: OrgsFiltersProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                className="rounded-xl pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="Buscar por nombre o slug..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <Select value={tierFilter} onValueChange={onTierFilterChange}>
            <SelectTrigger className="rounded-xl w-[180px]">
              <SelectValue placeholder="Filtrar por tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tiers</SelectItem>
              <SelectItem value="basic">Básico</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="rounded-xl w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="suspended">Suspendida</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {selectedCount > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedCount} seleccionada(s)
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Acciones masivas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => onBulkAction("activate")}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Activar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkAction("suspend")}>
                  <Pause className="h-4 w-4 mr-2" />
                  Suspender
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onBulkAction("change_tier", "basic")}
                >
                  Cambiar a Básico
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkAction("change_tier", "pro")}
                >
                  Cambiar a Pro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onBulkAction("change_tier", "premium")}
                >
                  Cambiar a Premium
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
            >
              Limpiar selección
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
