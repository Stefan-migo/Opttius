"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export interface ContactLensMatrixFormData {
  id: string;
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
  const [formData, setFormData] = useState({
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

  const handleOpenDialog = (matrix?: ContactLensMatrixFormData) => {
    if (matrix) {
      setEditingId(matrix.id);
      setFormData({
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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Matrices de Precios</h3>
        {!readOnly && (
          <Button
            onClick={() => handleOpenDialog()}
            variant="outline"
            size="sm"
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
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(matrix)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
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
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-500 uppercase">
                  Rangos de Graduación
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="sphere_min">Esfera Min</Label>
                    <Input
                      id="sphere_min"
                      type="number"
                      step="0.25"
                      value={formData.sphere_min}
                      onChange={(e) =>
                        setFormData({ ...formData, sphere_min: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sphere_max">Esfera Max</Label>
                    <Input
                      id="sphere_max"
                      type="number"
                      step="0.25"
                      value={formData.sphere_max}
                      onChange={(e) =>
                        setFormData({ ...formData, sphere_max: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cylinder_min">Cilindro Min</Label>
                    <Input
                      id="cylinder_min"
                      type="number"
                      step="0.25"
                      value={formData.cylinder_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cylinder_min: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cylinder_max">Cilindro Max</Label>
                    <Input
                      id="cylinder_max"
                      type="number"
                      step="0.25"
                      value={formData.cylinder_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cylinder_max: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="axis_min">Eje Min</Label>
                    <Input
                      id="axis_min"
                      type="number"
                      min="0"
                      max="180"
                      value={formData.axis_min}
                      onChange={(e) =>
                        setFormData({ ...formData, axis_min: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="axis_max">Eje Max</Label>
                    <Input
                      id="axis_max"
                      type="number"
                      min="0"
                      max="180"
                      value={formData.axis_max}
                      onChange={(e) =>
                        setFormData({ ...formData, axis_max: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="addition_min">Adición Min</Label>
                    <Input
                      id="addition_min"
                      type="number"
                      step="0.25"
                      value={formData.addition_min}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_min: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="addition_max">Adición Max</Label>
                    <Input
                      id="addition_max"
                      type="number"
                      step="0.25"
                      value={formData.addition_max}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          addition_max: e.target.value,
                        })
                      }
                      required
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
                    id="base_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_price}
                    onChange={(e) =>
                      setFormData({ ...formData, base_price: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
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
