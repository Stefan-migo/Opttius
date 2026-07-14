"use client";

import { Edit, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/formatting";
import { LENS_MATERIALS, LENS_TYPES } from "./lensMatricesConstants";
import type { LensPriceMatrix } from "./lensMatricesTypes";

interface Props {
  matrices: LensPriceMatrix[];
  loading: boolean;
  totalMatrices: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
  onEdit: (matrix: LensPriceMatrix) => void;
  onDelete: (id: string) => void;
}

export function LensMatrixTable({
  matrices,
  loading,
  totalMatrices,
  currentPage,
  itemsPerPage,
  totalPages,
  onPageChange,
  onItemsPerPageChange,
  onEdit,
  onDelete,
}: Props) {
  if (loading) {
    return <div className="text-center py-8">Cargando...</div>;
  }

  if (totalMatrices === 0) {
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
              <TableHead>Tipo</TableHead>
              <TableHead>Material</TableHead>
              <TableHead>Rango Esfera</TableHead>
              <TableHead>Rango Cilindro</TableHead>
              <TableHead>Rango Adición</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Costo Compra</TableHead>
              <TableHead>Sourcing</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrices.map((matrix) => (
              <TableRow key={matrix.id}>
                <TableCell className="font-medium">
                  {matrix.lens_families.name}
                </TableCell>
                <TableCell>
                  {
                    LENS_TYPES.find(
                      (t) => t.value === matrix.lens_families.lens_type,
                    )?.label
                  }
                </TableCell>
                <TableCell>
                  {
                    LENS_MATERIALS.find(
                      (m) => m.value === matrix.lens_families.lens_material,
                    )?.label
                  }
                </TableCell>
                <TableCell>
                  {matrix.sphere_min} a {matrix.sphere_max}
                </TableCell>
                <TableCell>
                  {matrix.cylinder_min} a {matrix.cylinder_max}
                </TableCell>
                <TableCell>
                  {(matrix as unknown).addition_min !== null &&
                  (matrix as unknown).addition_min !== undefined
                    ? `${(matrix as unknown).addition_min} a ${(matrix as unknown).addition_max || "4.0"}`
                    : "0.00 a 0.00"}
                </TableCell>
                <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {matrix.sourcing_type === "stock" ? "Stock" : "Surfaced"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={matrix.is_active ? "default" : "secondary"}
                  >
                    {matrix.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(matrix)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(matrix.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && totalMatrices > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[10, 20, 50, 100]}
            totalItems={totalMatrices}
            totalPages={totalPages}
            onItemsPerPageChange={onItemsPerPageChange}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
