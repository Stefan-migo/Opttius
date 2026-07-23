"use client";

import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CONTACT_LENS_DEFAULT_MATRICES } from "@/lib/lens-matrices/constants";
import { formatCurrency } from "@/lib/utils";

import { MatrixEditDialog } from "./_components/MatrixEditDialog";
import { MatrixSuggestionSection } from "./_components/MatrixSuggestionSection";

export interface ContactLensMatrixFormData {
  id: string; name?: string | null; sphere_min: number; sphere_max: number;
  cylinder_min: number; cylinder_max: number; axis_min: number; axis_max: number;
  addition_min: number; addition_max: number; base_price: number; cost: number; is_active: boolean;
}

interface ContactLensMatrixManagerProps {
  matrices: ContactLensMatrixFormData[];
  onChange: (matrices: ContactLensMatrixFormData[]) => void;
  readOnly?: boolean;
}

export function ContactLensMatrixManager({ matrices, onChange, readOnly = false }: ContactLensMatrixManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [suggestionOpen, setSuggestionOpen] = useState(matrices.length === 0);
  const [formData, setFormData] = useState({
    name: "", sphere_min: "-6.00", sphere_max: "6.00", cylinder_min: "-2.00", cylinder_max: "2.00",
    axis_min: "0", axis_max: "180", addition_min: "0.00", addition_max: "4.00", base_price: "0", cost: "0", is_active: true,
  });

  const handleApplyTemplate = () => {
    const newMatrices = CONTACT_LENS_DEFAULT_MATRICES.map((r, i) => ({
      id: `temp-${Date.now()}-${i}`, name: r.name, sphere_min: r.sphere_min, sphere_max: r.sphere_max,
      cylinder_min: r.cylinder_min, cylinder_max: r.cylinder_max, axis_min: r.axis_min, axis_max: r.axis_max,
      addition_min: r.addition_min, addition_max: r.addition_max, base_price: r.base_price, cost: r.cost, is_active: true,
    }));
    onChange([...matrices, ...newMatrices]);
  };

  const handleOpenDialog = (matrix?: ContactLensMatrixFormData) => {
    if (matrix) {
      setEditingId(matrix.id);
      setFormData({
        name: matrix.name ?? "", sphere_min: matrix.sphere_min.toString(), sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(), cylinder_max: matrix.cylinder_max.toString(),
        axis_min: matrix.axis_min.toString(), axis_max: matrix.axis_max.toString(),
        addition_min: matrix.addition_min.toString(), addition_max: matrix.addition_max.toString(),
        base_price: matrix.base_price.toString(), cost: matrix.cost.toString(), is_active: matrix.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", sphere_min: "-6.00", sphere_max: "6.00", cylinder_min: "-2.00", cylinder_max: "2.00", axis_min: "0", axis_max: "180", addition_min: "0.00", addition_max: "4.00", base_price: "0", cost: "0", is_active: true });
    }
    setShowDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newMatrix: ContactLensMatrixFormData = {
      id: editingId || `temp-${Date.now()}`, name: formData.name?.trim() || undefined,
      sphere_min: parseFloat(formData.sphere_min), sphere_max: parseFloat(formData.sphere_max),
      cylinder_min: parseFloat(formData.cylinder_min), cylinder_max: parseFloat(formData.cylinder_max),
      axis_min: parseInt(formData.axis_min, 10), axis_max: parseInt(formData.axis_max, 10),
      addition_min: parseFloat(formData.addition_min), addition_max: parseFloat(formData.addition_max),
      base_price: parseFloat(formData.base_price), cost: parseFloat(formData.cost), is_active: formData.is_active,
    };
    onChange(editingId ? matrices.map((m) => m.id === editingId ? newMatrix : m) : [...matrices, newMatrix]);
    setShowDialog(false);
  };

  const handleDelete = (id: string) => { if (confirm("¿Estás seguro de eliminar esta matriz?")) onChange(matrices.filter((m) => m.id !== id)); };

  return (
    <div className="space-y-4">
      {!readOnly && <MatrixSuggestionSection open={suggestionOpen} onToggle={() => setSuggestionOpen(!suggestionOpen)} onApplyTemplate={handleApplyTemplate} />}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Matrices de Precios</h3>
        {!readOnly && <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}><Plus className="h-4 w-4 mr-2" />Agregar Matriz</Button>}
      </div>

      {matrices.length === 0 ? (
        <div className="text-center p-8 border rounded-lg bg-gray-50 text-gray-500">No hay matrices de precios definidas. Agrega al menos una.</div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Esfera</TableHead><TableHead>Cilindro</TableHead><TableHead>Eje</TableHead><TableHead>Adición</TableHead><TableHead>Precio</TableHead><TableHead>Costo</TableHead>{!readOnly && <TableHead className="text-right">Acciones</TableHead>}</TableRow>
            </TableHeader>
            <TableBody>
              {matrices.map((matrix) => (
                <TableRow key={matrix.id}>
                  <TableCell>{matrix.name || `${matrix.sphere_min} a ${matrix.sphere_max}`}</TableCell>
                  <TableCell>{matrix.sphere_min} a {matrix.sphere_max}</TableCell>
                  <TableCell>{matrix.cylinder_min} a {matrix.cylinder_max}</TableCell>
                  <TableCell>{matrix.axis_min} a {matrix.axis_max}</TableCell>
                  <TableCell>{matrix.addition_min} a {matrix.addition_max}</TableCell>
                  <TableCell>{formatCurrency(matrix.base_price)}</TableCell>
                  <TableCell>{formatCurrency(matrix.cost)}</TableCell>
                  {!readOnly && <TableCell className="text-right"><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" onClick={() => handleOpenDialog(matrix)}><Edit className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(matrix.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MatrixEditDialog open={showDialog} editingId={editingId} formData={formData} onOpenChange={setShowDialog} onFormChange={setFormData} onSubmit={handleSubmit} />
    </div>
  );
}
