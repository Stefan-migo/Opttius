"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  categories: { id: string; name: string }[];
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onStatusChange: (v: string) => void;
}

export function BulkFiltersBar({ searchTerm, categoryFilter, statusFilter, categories, onSearchChange, onCategoryChange, onStatusChange }: Props) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input placeholder="Buscar productos..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} />
          </div>
          <Select value={categoryFilter} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="archived">Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
