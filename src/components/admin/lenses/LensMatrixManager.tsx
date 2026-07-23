"use client";

import { useState } from "react";

import {
  getOpticalDefaultMatrices,
  OPTICAL_MATRIX_TEMPLATE,
} from "@/lib/lens-matrices/constants";

import { LensMatrixDialog } from "./_components/LensMatrixDialog";
import { MatrixSuggestionPanel } from "./_components/MatrixSuggestionPanel";
import { MatrixTable } from "./_components/MatrixTable";
import type { LensMatrixFormData } from "./types";

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
        name: matrix.name ?? "", sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(), cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(), addition_min: matrix.addition_min.toString(),
        addition_max: matrix.addition_max.toString(), base_price: matrix.base_price.toString(),
        cost: matrix.cost.toString(), sourcing_type: matrix.sourcing_type, is_active: matrix.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "", sphere_min: "-6.00", sphere_max: "6.00", cylinder_min: "-2.00", cylinder_max: "2.00",
        addition_min: "0.00", addition_max: isMonofocal ? "0.00" : "4.00",
        base_price: "0", cost: "0", sourcing_type: "surfaced", is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleApplyTemplate = (template: "defaults" | "full") => {
    const rows = template === "defaults" ? getOpticalDefaultMatrices(lensType) : OPTICAL_MATRIX_TEMPLATE;
    const newMatrices: LensMatrixFormData[] = rows.map((r, i) => ({
      id: `temp-${Date.now()}-${i}`, name: r.name, sphere_min: r.sphere_min, sphere_max: r.sphere_max,
      cylinder_min: r.cylinder_min, cylinder_max: r.cylinder_max, addition_min: r.addition_min,
      addition_max: r.addition_max, base_price: r.base_price, cost: r.cost,
      sourcing_type: r.sourcing_type, is_active: true,
    }));
    if (onChange) onChange([...matrices, ...newMatrices]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMatrix: LensMatrixFormData = {
      id: editingId || `temp-${Date.now()}`, name: formData.name?.trim() || undefined,
      sphere_min: parseFloat(formData.sphere_min), sphere_max: parseFloat(formData.sphere_max),
      cylinder_min: parseFloat(formData.cylinder_min), cylinder_max: parseFloat(formData.cylinder_max),
      addition_min: isMonofocal ? 0 : parseFloat(formData.addition_min),
      addition_max: isMonofocal ? 0 : parseFloat(formData.addition_max),
      base_price: parseFloat(formData.base_price), cost: parseFloat(formData.cost),
      sourcing_type: formData.sourcing_type, is_active: formData.is_active,
    };
    if (editingId) {
      if (onMatrixUpdate) { onMatrixUpdate(newMatrix).then(() => setShowDialog(false)); }
      else if (onChange) { onChange(matrices.map((m) => (m.id === editingId ? newMatrix : m))); setShowDialog(false); }
    } else {
      if (onMatrixCreate) { onMatrixCreate(newMatrix).then(() => setShowDialog(false)); }
      else if (onChange) { onChange([...matrices, newMatrix]); setShowDialog(false); }
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta matriz?")) {
      if (onMatrixDelete) { onMatrixDelete(id); }
      else if (onChange) { onChange(matrices.filter((m) => m.id !== id)); }
    }
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <MatrixSuggestionPanel
          open={suggestionOpen}
          onToggle={() => setSuggestionOpen(!suggestionOpen)}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

      <MatrixTable
        matrices={matrices}
        readOnly={readOnly}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        onAdd={() => handleOpenDialog()}
      />

      <LensMatrixDialog
        open={showDialog}
        editingId={editingId}
        formData={formData}
        isMonofocal={isMonofocal}
        onClose={() => setShowDialog(false)}
        onSubmit={handleSubmit}
        onChange={(d) => setFormData((prev) => ({ ...prev, ...d }))}
      />
    </div>
  );
}
