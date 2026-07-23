"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { LENS_MATERIALS, LENS_TYPES } from "./lensMatricesConstants";
import type { LensFamily, LensMatrixFormData, LensPriceMatrix } from "./lensMatricesTypes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMatrix: LensPriceMatrix | null;
  formData: LensMatrixFormData;
  setFormData: React.Dispatch<React.SetStateAction<LensMatrixFormData>>;
  families: LensFamily[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
}

export function LensMatrixFormDialog({
  open,
  onOpenChange,
  editingMatrix,
  formData,
  setFormData,
  families,
  onSubmit,
  onClose,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[95vh] overflow-y-auto"
        key={`dialog-${editingMatrix?.id || "new"}-${Date.now()}`}
      >
        <DialogHeader>
          <DialogTitle>
            {editingMatrix ? "Editar Matriz" : "Nueva Matriz"}
          </DialogTitle>
          <DialogDescription>
            {editingMatrix
              ? "Modifica los datos de la matriz de precios"
              : "Crea una nueva matriz de precios para lentes"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-5 py-4">
            <div>
              <Label htmlFor="lens_family_id">Familia de Lente *</Label>
              <Select
                required
                value={formData.lens_family_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, lens_family_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar familia" />
                </SelectTrigger>
                <SelectContent>
                  {families
                    .filter((f) => (f as unknown).is_active !== false)
                    .map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name} {family.brand && `(${family.brand})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {formData.lens_family_id && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                {(() => {
                  const fam = families.find(
                    (f) => f.id === formData.lens_family_id,
                  );
                  const typeLabel = fam
                    ? LENS_TYPES.find((t) => t.value === fam.lens_type)?.label
                    : undefined;
                  const materialLabel = fam
                    ? LENS_MATERIALS.find(
                        (m) => m.value === fam.lens_material,
                      )?.label
                    : undefined;
                  return (
                    <p className="text-sm text-blue-800">
                      Esta familia ya define <b>Tipo</b>: {typeLabel || "—"} y{" "}
                      <b>Material</b>: {materialLabel || "—"}.
                    </p>
                  );
                })()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sphere_min">Esfera Mínima *</Label>
                <Input
                  required
                  id="sphere_min"
                  placeholder="-10.00"
                  step="0.25"
                  type="number"
                  value={formData.sphere_min}
                  onChange={(e) =>
                    setFormData({ ...formData, sphere_min: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="sphere_max">Esfera Máxima *</Label>
                <Input
                  required
                  id="sphere_max"
                  placeholder="+6.00"
                  step="0.25"
                  type="number"
                  value={formData.sphere_max}
                  onChange={(e) =>
                    setFormData({ ...formData, sphere_max: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cylinder_min">Cilindro Mínimo *</Label>
                <Input
                  required
                  id="cylinder_min"
                  placeholder="-2.00"
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
                <Label htmlFor="cylinder_max">Cilindro Máximo *</Label>
                <Input
                  required
                  id="cylinder_max"
                  placeholder="0.00"
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

            <div
              className="border-t-2 border-purple-300 pt-5 mt-5"
              style={{ display: "block" }}
            >
              <div className="bg-purple-50 border-2 border-purple-200 p-4 rounded-lg mb-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">
                  💡 Campos de Adición (Presbicia):
                </p>
                <p className="text-xs text-purple-700">
                  Estos campos definen el rango de adición para cerca.
                  Necesarios para calcular precios de lentes progresivos,
                  bifocales y trifocales.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    className="text-sm font-semibold"
                    htmlFor="addition_min"
                  >
                    Adición Mínima (Dioptrías) *
                    <span className="text-xs text-gray-500 ml-1 font-normal">
                      (0.00 - 4.00)
                    </span>
                  </Label>
                  <Input
                    required
                    className="mt-2"
                    id="addition_min"
                    max="4"
                    min="0"
                    placeholder="0.00"
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
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Monofocales:</strong> 0.00 |{" "}
                    <strong>Progresivos/Bifocales:</strong> 0.00
                  </p>
                </div>
                <div>
                  <Label
                    className="text-sm font-semibold"
                    htmlFor="addition_max"
                  >
                    Adición Máxima (Dioptrías) *
                    <span className="text-xs text-gray-500 ml-1 font-normal">
                      (0.00 - 4.00)
                    </span>
                  </Label>
                  <Input
                    required
                    className="mt-2"
                    id="addition_max"
                    max="4"
                    min="0"
                    placeholder="4.00"
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
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Monofocales:</strong> 0.00 |{" "}
                    <strong>Progresivos/Bifocales:</strong> 4.00
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="base_price">Precio Venta *</Label>
              <Input
                required
                id="base_price"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={formData.base_price}
                onChange={(e) =>
                  setFormData({ ...formData, base_price: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="cost">Costo Compra *</Label>
              <Input
                required
                id="cost"
                placeholder="0.00"
                step="0.01"
                type="number"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="sourcing_type">Tipo de Sourcing *</Label>
              <Select
                required
                value={formData.sourcing_type}
                onValueChange={(value: "stock" | "surfaced") =>
                  setFormData({ ...formData, sourcing_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock (en bodega)</SelectItem>
                  <SelectItem value="surfaced">
                    Surfaced (fabricar)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                checked={formData.is_active}
                className="h-4 w-4 rounded border-gray-300"
                id="is_active"
                type="checkbox"
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
              />
              <Label className="cursor-pointer" htmlFor="is_active">
                Activa
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingMatrix ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
