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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  OPTICAL_MATRIX_TEMPLATE,
  getOpticalDefaultMatrices,
} from "@/lib/lens-matrices/constants";
import {
  OPTICAL_MATRIX_SUGGESTION_TITLE,
  OPTICAL_MATRIX_SUGGESTION_DESCRIPTION,
  OPTICAL_MATRIX_SUGGESTION_ROWS,
} from "@/lib/lens-matrices/suggestion-text";

export interface LensMatrixFormData {
  id: string; // Temporary ID or DB ID
  name?: string | null;
  sphere_min: number;
  sphere_max: number;
  cylinder_min: number;
  cylinder_max: number;
  addition_min: number;
  addition_max: number;
  base_price: number;
  cost: number;
  sourcing_type: "stock" | "surfaced";
  is_active: boolean;
}

interface LensMatrixManagerProps {
  matrices: LensMatrixFormData[];
  onChange?: (matrices: LensMatrixFormData[]) => void;
  readOnly?: boolean;
  lensType?: string;
  onMatrixCreate?: (matrix: LensMatrixFormData) => Promise<void>;
  onMatrixUpdate?: (matrix: LensMatrixFormData) => Promise<void>;
  onMatrixDelete?: (id: string) => Promise<void>;
}

export function LensMatrixManager({
  matrices,
  onChange,
  readOnly = false,
  lensType = "single_vision",
  onMatrixCreate,
  onMatrixUpdate,
  onMatrixDelete,
}: LensMatrixManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(matrices.length === 0);

  const isMonofocal = lensType === "single_vision";

  const [formData, setFormData] = useState({
    name: "",
    sphere_min: "-6.00",
    sphere_max: "6.00",
    cylinder_min: "-2.00",
    cylinder_max: "2.00",
    addition_min: "0.00",
    addition_max: "4.00",
    base_price: "0",
    cost: "0",
    sourcing_type: "surfaced" as "stock" | "surfaced",
    is_active: true,
  });

  const handleOpenDialog = (matrix?: LensMatrixFormData) => {
    if (matrix) {
      setEditingId(matrix.id);
      setFormData({
        name: matrix.name ?? "",
        sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(),
        addition_min: matrix.addition_min.toString(),
        addition_max: matrix.addition_max.toString(),
        base_price: matrix.base_price.toString(),
        cost: matrix.cost.toString(),
        sourcing_type: matrix.sourcing_type,
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
        addition_min: isMonofocal ? "0.00" : "0.00",
        addition_max: isMonofocal ? "0.00" : "4.00",
        base_price: "0",
        cost: "0",
        sourcing_type: "surfaced",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleApplyTemplate = (template: "defaults" | "full") => {
    const rows =
      template === "defaults"
        ? getOpticalDefaultMatrices(lensType)
        : OPTICAL_MATRIX_TEMPLATE;
    const newMatrices: LensMatrixFormData[] = rows.map((r, i) => ({
      id: `temp-${Date.now()}-${i}`,
      name: r.name,
      sphere_min: r.sphere_min,
      sphere_max: r.sphere_max,
      cylinder_min: r.cylinder_min,
      cylinder_max: r.cylinder_max,
      addition_min: r.addition_min,
      addition_max: r.addition_max,
      base_price: r.base_price,
      cost: r.cost,
      sourcing_type: r.sourcing_type,
      is_active: true,
    }));
    if (onChange) onChange([...matrices, ...newMatrices]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newMatrix: LensMatrixFormData = {
      id: editingId || `temp-${Date.now()}`,
      name: formData.name?.trim() || undefined,
      sphere_min: parseFloat(formData.sphere_min),
      sphere_max: parseFloat(formData.sphere_max),
      cylinder_min: parseFloat(formData.cylinder_min),
      cylinder_max: parseFloat(formData.cylinder_max),
      addition_min: isMonofocal ? 0 : parseFloat(formData.addition_min),
      addition_max: isMonofocal ? 0 : parseFloat(formData.addition_max),
      base_price: parseFloat(formData.base_price),
      cost: parseFloat(formData.cost),
      sourcing_type: formData.sourcing_type,
      is_active: formData.is_active,
    };

    if (editingId) {
      if (onMatrixUpdate) {
        onMatrixUpdate(newMatrix).then(() => setShowDialog(false));
      } else if (onChange) {
        onChange(matrices.map((m) => (m.id === editingId ? newMatrix : m)));
        setShowDialog(false);
      }
    } else {
      if (onMatrixCreate) {
        onMatrixCreate(newMatrix).then(() => setShowDialog(false));
      } else if (onChange) {
        onChange([...matrices, newMatrix]);
        setShowDialog(false);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta matriz?")) {
      if (onMatrixDelete) {
        onMatrixDelete(id);
      } else if (onChange) {
        onChange(matrices.filter((m) => m.id !== id));
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Suggestion panel (collapsible) */}
      {!readOnly && (
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setSuggestionOpen(!suggestionOpen)}
            className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium text-sm text-gray-700">
              {OPTICAL_MATRIX_SUGGESTION_TITLE}
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
                {OPTICAL_MATRIX_SUGGESTION_DESCRIPTION}
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
                    {OPTICAL_MATRIX_SUGGESTION_ROWS.map((row) => (
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyTemplate("defaults")}
                >
                  Crear Rango base + Fallback
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyTemplate("full")}
                >
                  Crear plantilla completa
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

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
                <TableHead>Nombre</TableHead>
                <TableHead>Esfera</TableHead>
                <TableHead>Cilindro</TableHead>
                <TableHead>Adición</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Costo</TableHead>
                <TableHead>Sourcing</TableHead>
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
                    {matrix.addition_min} a {matrix.addition_max}
                  </TableCell>
                  <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                  <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {matrix.sourcing_type === "stock" ? "Stock" : "Surfaced"}
                    </Badge>
                  </TableCell>
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
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Matriz" : "Nueva Matriz de Precios"}
            </DialogTitle>
            <DialogDescription>
              Define los rangos de graduación y precios para esta matriz.
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
                {/* Addition Ranges - hidden for single_vision (monofocal) */}
                {!isMonofocal && (
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-md">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label
                          htmlFor="addition_min"
                          className="text-purple-900"
                        >
                          Adición Min
                        </Label>
                        <Input
                          id="addition_min"
                          type="number"
                          step="0.25"
                          min="0"
                          max="4"
                          value={formData.addition_min}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              addition_min: e.target.value,
                            })
                          }
                          required
                          className="bg-white"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="addition_max"
                          className="text-purple-900"
                        >
                          Adición Max
                        </Label>
                        <Input
                          id="addition_max"
                          type="number"
                          step="0.25"
                          min="0"
                          max="4"
                          value={formData.addition_max}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              addition_max: e.target.value,
                            })
                          }
                          required
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-500 uppercase">
                  Precios y Configuración
                </h4>
                <div>
                  <Label htmlFor="base_price">Precio Venta</Label>
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
                  <Label htmlFor="cost">Costo Compra</Label>
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
                <div>
                  <Label htmlFor="sourcing_type">Tipo de Sourcing</Label>
                  <Select
                    value={formData.sourcing_type}
                    onValueChange={(value: "stock" | "surfaced") =>
                      setFormData({ ...formData, sourcing_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock">Stock (Inventario)</SelectItem>
                      <SelectItem value="surfaced">
                        Surfaced (Laboratorio)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="is_active_matrix"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_active_matrix" className="cursor-pointer">
                    Matriz Activa
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
                {editingId ? "Actualizar Matriz" : "Agregar Matriz"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
