"use client";

import { Edit, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import type { LensMatrixFormData } from "../types";

interface MatrixTableProps {
  matrices: LensMatrixFormData[];
  readOnly?: boolean;
  onEdit: (matrix: LensMatrixFormData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function MatrixTable({ matrices, readOnly, onEdit, onDelete, onAdd }: MatrixTableProps) {
  return (
    <>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Matrices de Precios</h3>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />Agregar Matriz
          </Button>
        )}
      </div>

      {matrices.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50 text-gray-500">
          No hay matrices de precios definidas. Agrega al menos una.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Esfera</TableHead>
                <TableHead>Cilindro</TableHead>
                <TableHead>Adición</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Sourcing</TableHead>
                {!readOnly && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrices.map((matrix) => (
                <TableRow key={matrix.id}>
                  <TableCell>{matrix.name || `${matrix.sphere_min} a ${matrix.sphere_max}`}</TableCell>
                  <TableCell>{matrix.sphere_min} a {matrix.sphere_max}</TableCell>
                  <TableCell>{matrix.cylinder_min} a {matrix.cylinder_max}</TableCell>
                  <TableCell>{matrix.addition_min} a {matrix.addition_max}</TableCell>
                  <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                  <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{matrix.sourcing_type === "stock" ? "Stock" : "Surfaced"}</Badge>
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => onEdit(matrix)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(matrix.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
