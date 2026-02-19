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
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Search Input */}
          <div className="flex-1">
            <label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
              Búsqueda de Registros
            </label>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4 transition-colors group-focus-within:text-epoch-primary" />
              <Input
                type="text"
                placeholder="Nombre, SKU, Marca o Código..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
                className="pl-12 h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-none focus:border-epoch-primary focus:ring-1 focus:ring-epoch-primary/20 font-serif italic text-sm transition-all"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            {/* Category Filter */}
            <div className="w-full sm:w-48">
              <label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
                Filtrado por Categoría
              </label>
              <Select value={categoryFilter} onValueChange={onCategoryChange}>
                <SelectTrigger className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-none font-display text-[10px] tracking-widest uppercase">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-admin-border-primary/20">
                  <SelectItem
                    value="all"
                    className="font-display text-[10px] tracking-widest uppercase"
                  >
                    Todas las categorías
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id}
                      className="font-display text-[10px] tracking-widest uppercase"
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-40">
              <label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
                Estado de Ficha
              </label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger className="h-11 bg-admin-bg-tertiary border-admin-border-primary/10 rounded-none font-display text-[10px] tracking-widest uppercase">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-admin-border-primary/20">
                  <SelectItem
                    value="all"
                    className="font-display text-[10px] tracking-widest uppercase text-admin-text-tertiary"
                  >
                    Todos los estados
                  </SelectItem>
                  <SelectItem
                    value="active"
                    className="font-display text-[10px] tracking-widest uppercase text-admin-success"
                  >
                    Activo
                  </SelectItem>
                  <SelectItem
                    value="draft"
                    className="font-display text-[10px] tracking-widest uppercase text-admin-text-tertiary"
                  >
                    Borrador
                  </SelectItem>
                  <SelectItem
                    value="archived"
                    className="font-display text-[10px] tracking-widest uppercase text-admin-error"
                  >
                    Archivado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Low Stock Toggle */}
            <div className="flex flex-col gap-2">
              <div className="h-5" /> {/* Spacer */}
              <Button
                variant="outline"
                onClick={onLowStockToggle}
                className={`h-11 px-6 rounded-none border-admin-border-primary/10 font-display font-bold text-[10px] tracking-[0.2em] uppercase transition-all ${
                  showLowStockOnly
                    ? "bg-admin-error text-white border-admin-error"
                    : "bg-white text-admin-text-primary hover:bg-admin-bg-tertiary"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 mr-2 ${showLowStockOnly ? "text-white" : "text-admin-error"}`}
                />
                {showLowStockOnly ? "TODOS" : "STOCK BAJO"}
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-widest mb-2 block">
                Visualización
              </label>
              <div className="flex items-center h-11 border border-admin-border-primary/10 bg-admin-bg-tertiary p-1 w-24">
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`flex-1 flex items-center justify-center h-full transition-all ${
                    viewMode === "grid"
                      ? "bg-white text-epoch-primary shadow-sm"
                      : "text-admin-text-tertiary hover:text-admin-text-primary"
                  }`}
                  title="Vista de cuadrícula"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange("table")}
                  className={`flex-1 flex items-center justify-center h-full transition-all ${
                    viewMode === "table"
                      ? "bg-white text-epoch-primary shadow-sm"
                      : "text-admin-text-tertiary hover:text-admin-text-primary"
                  }`}
                  title="Vista de archivo"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
