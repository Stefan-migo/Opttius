"use client";

import { Filter, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { categoryLabels, priorityLabels, statusLabels } from "./types";

interface TicketFiltersProps {
  filters: {
    status: string;
    priority: string;
    category: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onRefresh: () => void;
}

export function TicketFilters({
  filters,
  onFilterChange,
  onRefresh,
}: TicketFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filters.status}
              onValueChange={(v) => onFilterChange("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select
              value={filters.priority}
              onValueChange={(v) => onFilterChange("priority", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select
              value={filters.category}
              onValueChange={(v) => onFilterChange("category", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(categoryLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="flex gap-2">
              <Input
                placeholder="Ticket #, asunto..."
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
              />
              <Button
                size="icon"
                title="Refrescar"
                variant="outline"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
