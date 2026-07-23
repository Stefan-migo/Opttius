"use client";

import { Edit, Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import type { LensPriceMatrix } from "../types";

// ─── Search / Filter Bar ─────────────────────────────────────────────────────

interface SearchBarProps {
  searchTerm: string;
  familyFilter: string;
  families: { id: string; name: string }[];
  onSearchChange: (v: string) => void;
  onFamilyFilterChange: (v: string) => void;
}

export function SearchBar({
  searchTerm,
  familyFilter,
  families,
  onSearchChange,
  onFamilyFilterChange,
}: SearchBarProps) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar matrices..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="w-full sm:w-64">
        <Select value={familyFilter} onValueChange={onFamilyFilterChange}>
          <SelectTrigger>
            <SelectValue placeholder="Todas las familias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las familias</SelectItem>
            {families.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Matrices Table ──────────────────────────────────────────────────────────

interface MatricesTableProps {
  matrices: LensPriceMatrix[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  onEdit: (m: LensPriceMatrix) => void;
  onDelete: (id: string) => void;
  onToggleActive: (m: LensPriceMatrix) => void;
  onPageChange: (v: number) => void;
  onItemsPerPageChange: (v: number) => void;
}

export function MatricesTable({
  matrices,
  loading,
  currentPage,
  itemsPerPage,
  totalCount,
  onEdit,
  onDelete,
  onToggleActive,
  onPageChange,
  onItemsPerPageChange,
}: MatricesTableProps) {
  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }
  if (matrices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No se encontraron matrices de precios
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Familia</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Tipo de Lente</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Rango Esfera</TableHead>
              <TableHead>Rango Cilindro</TableHead>
              <TableHead>Precio Base</TableHead>
              <TableHead>Costo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrices.map((matrix) => (
              <TableRow key={matrix.id}>
                <TableCell className="font-medium">{matrix.lens_families?.name}</TableCell>
                <TableCell>{matrix.name || "-"}</TableCell>
                <TableCell>{matrix.lens_families?.brand || "-"}</TableCell>
                <TableCell>{matrix.lens_families?.lens_type}</TableCell>
                <TableCell>{matrix.lens_families?.lens_material}</TableCell>
                <TableCell>{matrix.sphere_min} a {matrix.sphere_max}</TableCell>
                <TableCell>{matrix.cylinder_min} a {matrix.cylinder_max}</TableCell>
                <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                <TableCell>
                  <Badge variant={matrix.is_active ? "default" : "secondary"}>
                    {matrix.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(matrix)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onToggleActive(matrix)}>
                      {matrix.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(matrix.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        className="mt-4"
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 20, 50, 100]}
        totalItems={totalCount}
        totalPages={Math.ceil(totalCount / itemsPerPage)}
        onItemsPerPageChange={onItemsPerPageChange}
        onPageChange={onPageChange}
      />
    </>
  );
}
