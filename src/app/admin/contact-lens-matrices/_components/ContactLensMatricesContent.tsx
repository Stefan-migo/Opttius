"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';
import type {
  ContactLensFamily,
  ContactLensPriceMatrix,
} from "@/types/contact-lens";

import { ContactLensMatricesList } from "./ContactLensMatricesList";
import { ContactLensMatrixDialog } from "./ContactLensMatrixDialog";

interface ContactLensPriceMatrixWithFamily extends ContactLensPriceMatrix {
  contact_lens_families: ContactLensFamily;
}

type MatrixFormData = {
  contact_lens_family_id: string;
  sphere_min: string;
  sphere_max: string;
  cylinder_min: string;
  cylinder_max: string;
  axis_min: string;
  axis_max: string;
  addition_min: string;
  addition_max: string;
  base_price: string;
  cost: string;
  is_active: boolean;
};

export default function ContactLensMatricesContent() {
  const [matrices, setMatrices] = useState<ContactLensPriceMatrixWithFamily[]>([]);
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<ContactLensPriceMatrixWithFamily | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");

  const [formData, setFormData] = useState<MatrixFormData>({
    contact_lens_family_id: "",
    sphere_min: "",
    sphere_max: "",
    cylinder_min: "0",
    cylinder_max: "0",
    axis_min: "0",
    axis_max: "180",
    addition_min: "0",
    addition_max: "4.0",
    base_price: "",
    cost: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
    fetchMatrices();
  }, [includeInactive, selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await fetch("/api/admin/contact-lens-families?include_inactive=true");
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.families || []);
      }
    } catch (error) {
      appLogger.error("Error fetching families:", error);
    }
  };

  const fetchMatrices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedFamilyId !== "all") params.append("family_id", selectedFamilyId);
      if (includeInactive) params.append("include_inactive", "true");
      const response = await fetch(`/api/admin/contact-lens-matrices?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar matrices");
      const data = await response.json();
      setMatrices(data.matrices || []);
    } catch (error) {
      appLogger.error("Error fetching matrices:", error);
      toast.error("Error al cargar matrices de precios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (matrix?: ContactLensPriceMatrixWithFamily) => {
    if (matrix) {
      setEditingMatrix(matrix);
      setFormData({
        contact_lens_family_id: matrix.contact_lens_family_id,
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
      setEditingMatrix(null);
      setFormData({
        contact_lens_family_id: selectedFamilyId !== "all" ? selectedFamilyId : "",
        sphere_min: "",
        sphere_max: "",
        cylinder_min: "0",
        cylinder_max: "0",
        axis_min: "0",
        axis_max: "180",
        addition_min: "0",
        addition_max: "4.0",
        base_price: "",
        cost: "",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingMatrix(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMatrix
        ? `/api/admin/contact-lens-matrices/${editingMatrix.id}`
        : "/api/admin/contact-lens-matrices";
      const method = editingMatrix ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        contact_lens_family_id: formData.contact_lens_family_id,
        sphere_min: parseFloat(formData.sphere_min),
        sphere_max: parseFloat(formData.sphere_max),
        cylinder_min: parseFloat(formData.cylinder_min),
        cylinder_max: parseFloat(formData.cylinder_max),
        axis_min: parseInt(formData.axis_min),
        axis_max: parseInt(formData.axis_max),
        addition_min: parseFloat(formData.addition_min),
        addition_max: parseFloat(formData.addition_max),
        base_price: parseFloat(formData.base_price),
        cost: parseFloat(formData.cost),
        is_active: formData.is_active,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar matriz");
      }

      toast.success(editingMatrix ? "Matriz actualizada exitosamente" : "Matriz creada exitosamente");
      handleCloseDialog();
      fetchMatrices();
    } catch (error: unknown) {
      toast.error((error as Error).message || "Error al guardar matriz");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta matriz?")) return;
    try {
      const response = await fetch(`/api/admin/contact-lens-matrices/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Error al eliminar matriz");
      toast.success("Matriz eliminada exitosamente");
      fetchMatrices();
    } catch {
      toast.error("Error al eliminar matriz");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Matrices de Precios de Lentes de Contacto</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las matrices de precios para calcular costos de lentes de contacto
          </p>
        </div>
      </div>

      <ContactLensMatricesList
        families={families}
        loading={loading}
        matrices={matrices}
        onCreate={() => handleOpenDialog()}
        onDelete={handleDelete}
        onEdit={(matrix) => handleOpenDialog(matrix)}
        onRefresh={fetchMatrices}
      />

      <ContactLensMatrixDialog
        editingMatrix={editingMatrix}
        families={families}
        formData={formData}
        open={showDialog}
        onClose={handleCloseDialog}
        onFormChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
        onOpenChange={setShowDialog}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
