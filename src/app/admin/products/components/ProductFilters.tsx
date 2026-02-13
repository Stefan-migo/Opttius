"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, AlertTriangle, Grid3X3, List } from "lucide-react";
import { Category } from "../hooks/useCategories";

interface ProductFiltersProps {
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  showLowStockOnly: boolean;
  viewMode: "grid" | "table";
  categories: Category[];
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
  onLowStockToggle: () => void;
  onViewModeChange: (mode: "grid" | "table") => void;
}

export default function ProductFilters({
  searchTerm,
  categoryFilter,
  statusFilter,
  showLowStockOnly,
  viewMode,
  categories,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onLowStockToggle,
  onViewModeChange,
}: ProductFiltersProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <CardHeader>
        <CardTitle className="flex items-center text-azul-profundo">
          <Filter className="h-5 w-5 mr-2" />
          Filtros y Búsqueda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="search"
                placeholder="Buscar productos por nombre..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  // Prevent page reload when Enter is pressed
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-48">
            <Select value={categoryFilter} onValueChange={onCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="archived">Archivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Low Stock Toggle */}
          <div className="w-full sm:w-auto">
            <Button
              variant={showLowStockOnly ? "default" : "outline"}
              size="sm"
              onClick={onLowStockToggle}
            >
              {showLowStockOnly ? "Ver Todos" : "Ver"}
              <AlertTriangle className="h-4 w-4 ml-2" />
              Stock Bajo
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="w-full sm:w-auto flex items-center gap-2 border rounded-md p-1 bg-background">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("grid")}
              className="flex-1"
              title="Vista de cartas"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("table")}
              className="flex-1"
              title="Vista de lista"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
