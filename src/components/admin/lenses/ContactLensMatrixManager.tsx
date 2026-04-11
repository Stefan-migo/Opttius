"use client";

import { ChevronDown, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CONTACT_LENS_DEFAULT_MATRICES } from "@/lib/lens-matrices/constants";
import {
  CONTACT_LENS_MATRIX_SUGGESTION_DESCRIPTION,
  CONTACT_LENS_MATRIX_SUGGESTION_ROWS,
  CONTACT_LENS_MATRIX_SUGGESTION_TITLE,
} from "@/lib/lens-matrices/suggestion-text";
import { formatCurrency } from "@/lib/utils";

export interface ContactLensMatrixFormData {
  id: string;
  name?: string | null;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  axis_min: number;
  axis_max: number;
  addition_min: number;
  addition_max: number;
  base_price: number;
  cost: number;
  is_active: boolean;
}

interface ContactLensMatrixManagerProps {
  matrices: ContactLensMatrixFormData[];
  onChange: (matrices: ContactLensMatrixFormData[]) => void;
  readOnly?: boolean;
}

export function ContactLensMatrixManager({
  matrices,
  onChange,
  readOnly = false,
}: ContactLensMatrixManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(matrices.length === 0);
  const [formData, setFormData] = useState({
    name: "",
    sphere_min: "-6.00",
    sphere_max: "6.00",
    cylinder_min: "-2.00",
    cylinder_max: "2.00",
    axis_min: "0",
    axis_max: "180",
    addition_min: "0.00",
    addition_max: "4.00",
    base_price: "0",
    cost: "0",
    is_active: true,
  });

  const handleApplyTemplate = () => {
    const newMatrices: ContactLensMatrixFormData[] =
      CONTACT_LENS_DEFAULT_MATRICES.map((r, i) => ({
        id: `temp-${Date.now()}-${i}`,
        name: r.name,
        sphere_min: r.sphere_min,
        sphere_max: r.sphere_max,
        cylinder_min: r.cylinder_min,
        cylinder_max: r.cylinder_max,
        axis_min: r.axis_min,
        axis_max: r.axis_max,
        addition_min: r.addition_min,
        addition_max: r.addition_max,
        base_price: r.base_price,
        cost: r.cost,
        is_active: true,
      }));
    onChange([...matrices, ...newMatrices]);
  };

  const handleOpenDialog = (matrix?: ContactLensMatrixFormData) => {
    if (matrix) {
      setEditingId(matrix.id);
      setFormData({
        name: matrix.name ?? "",
        sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(),
        axis_min: matrix.axis_min.toString(),
        axis_max: matrix.axis_max.toString(),
        addition_min: matrix.addition_min.toString(),
        addition_max: matrix.addition_max.toString(),
        base_price: matrix.base_price.toString(),
        cost: matrix.cost.toString(),
        is_active: matrix.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        sphere_min: "-6.00",
        sphere_max: "6.00",
        cylinder_min: "-2.00",
        cylinder_max: "2.00",
        axis_min: "0",
        axis_max: "180",
        addition_min: "0.00",
        addition_max: "4.00",
        base_price: "0",
        cost: "0",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newMatrix: ContactLensMatrixFormData = {
      id: editingId || `temp-${Date.now()}`,
      name: formData.name?.trim() || undefined,
      sphere_min: parseFloat(formData.sphere_min),
      sphere_max: parseFloat(formData.sphere_max),
      cylinder_min: parseFloat(formData.cylinder_min),
      cylinder_max: parseFloat(formData.cylinder_max),
      axis_min: parseInt(formData.axis_min, 10),
      axis_max: parseInt(formData.axis_max, 10),
      addition_min: parseFloat(formData.addition_min),
      addition_max: parseFloat(formData.addition_max),
      base_price: parseFloat(formData.base_price),
      cost: parseFloat(formData.cost),
      is_active: formData.is_active,
    };

    if (editingId) {
      onChange(matrices.map((m) => (m.id === editingId ? newMatrix : m)));
    } else {
      onChange([...matrices, newMatrix]);
    }
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta matriz?")) {
      onChange(matrices.filter((m) => m.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            type="button"
            onClick={() => setSuggestionOpen(!suggestionOpen)}
          >
            <span className="font-medium text-sm text-gray-700">
              {CONTACT_LENS_MATRIX_SUGGESTION_TITLE}
            </span>
            {suggestionOpen ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {suggestionOpen && (
            <div className="p-4 pt-0 space-y-4 border-t">
              <p className="text-sm text-gray-600">
                {CONTACT_LENS_MATRIX_SUGGESTION_DESCRIPTION}
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Rango</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CONTACT_LENS_MATRIX_SUGGESTION_ROWS.map((row) => (
                      <TableRow key={row.name}>
                        <TableCell className="font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {row.range}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={handleApplyTemplate}
              >
                Crear Rango base + Fallback
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Matrices de Precios</h3>
        {!readOnly && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Matriz
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
                <TableHead>Eje</TableHead>
                <TableHead>Adición</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Costo</TableHead>
                {!readOnly && (
                  <TableHead className="text-right">Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrices.map((matrix) => (
                <TableRow key={matrix.id}>
                  <TableCell>
                    {matrix.name ||
                      `${matrix.sphere_min} a ${matrix.sphere_max}`}
                  </TableCell>
                  <TableCell>
                    {matrix.sphere_min} a {matrix.sphere_max}
                  </TableCell>
                  <TableCell>
                    {matrix.cylinder_min} a {matrix.cylinder_max}
                  </TableCell>
                  <TableCell>
                    {matrix.axis_min} a {matrix.axis_max}
                  </TableCell>
                  <TableCell>
                    {matrix.addition_min} a {matrix.addition_max}
                  </TableCell>
                  <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                  <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenDialog(matrix)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(matrix.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Matriz" : "Nueva Matriz de Precios"}
            </DialogTitle>
            <DialogDescription>
              Define los rangos de graduación y precios para lentes de contacto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-4 col-span-2">
                <div>
                  <Label htmlFor="matrix_name">Nombre (opcional)</Label>
                  <Input
                    id="matrix_name"
                    placeholder="Ej: Rango base, Fallback..."
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-500 uppercase">
                  Rangos de Graduación
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="sphere_min">Esfera Min</Label>
                    <Input
                      required
                      id="sphere_min"
                      step="0.25"
                      type="number"
                      value={formData.sphere_min}
                      onChange={(e) =>
                        setFormData({ ...formData, sphere_min: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="sphere_max">Esfera Max</Label>
                    <Input
                      required
                      id="sphere_max"
                      step="0.25"
                      type="number"
                      value={formData.sphere_max}
                      onChange={(e) =>
                        setFormData({ ...formData, sphere_max: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cylinder_min">Cilindro Min</Label>
                    <Input
                      required
                      id="cylinder_min"
                      step="0.25"
                      type="number"
                      value={formData.cylinder_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cylinder_min: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="cylinder_max">Cilindro Max</Label>
                    <Input
                      required
                      id="cylinder_max"
                      step="0.25"
                      type="number"
                      value={formData.cylinder_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cylinder_max: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="axis_min">Eje Min</Label>
                    <Input
                      required
                      id="axis_min"
                      max="180"
                      min="0"
                      type="number"
                      value={formData.axis_min}
                      onChange={(e) =>
                        setFormData({ ...formData, axis_min: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="axis_max">Eje Max</Label>
                    <Input
                      required
                      id="axis_max"
                      max="180"
                      min="0"
                      type="number"
                      value={formData.axis_max}
                      onChange={(e) =>
                        setFormData({ ...formData, axis_max: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="addition_min">Adición Min</Label>
                    <Input
                      required
                      id="addition_min"
                      step="0.25"
                      type="number"
                      value={formData.addition_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_min: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="addition_max">Adición Max</Label>
                    <Input
                      required
                      id="addition_max"
                      step="0.25"
                      type="number"
                      value={formData.addition_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_max: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-500 uppercase">
                  Precios
                </h4>
                <div>
                  <Label htmlFor="base_price">Precio Base</Label>
                  <Input
                    required
                    id="base_price"
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    required
                    id="cost"
                    min="0"
                    step="0.01"
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    checked={formData.is_active}
                    className="rounded"
                    id="is_active"
                    type="checkbox"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  <Label className="cursor-pointer" htmlFor="is_active">
                    Activa
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingId ? "Actualizar" : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
