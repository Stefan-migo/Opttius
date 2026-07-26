"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { appLogger } from '@/lib/logger';

import { ImportCSVDialog } from "./ImportCSVDialog";
import type { LensFamily, LensMatrixFormData,LensPriceMatrix } from "./lensMatricesTypes";
import { LensMatrixFilters } from "./LensMatrixFilters";
import { LensMatrixFormDialog } from "./LensMatrixFormDialog";
import { LensMatrixHeader } from "./LensMatrixHeader";
import { LensMatrixTable } from "./LensMatrixTable";

export default function LensMatricesContent() {
  const [matrices, setMatrices] = useState<LensPriceMatrix[]>([]);
  const [families, setFamilies] = useState<LensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<LensPriceMatrix | null>(
    null,
  );
  const [includeInactive, setIncludeInactive] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [formData, setFormData] = useState<LensMatrixFormData>({
    lens_family_id: "",
    sphere_min: "",
    sphere_max: "",
    cylinder_min: "",
    cylinder_max: "",
    addition_min: "0",
    addition_max: "4.0",
    base_price: "",
    sourcing_type: "surfaced" as "stock" | "surfaced",
    cost: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
    fetchMatrices();
  }, [includeInactive, selectedFamilyId]);

  const fetchFamilies = async () => {
    try {
      const response = await fetch(
        "/api/admin/lens-families?include_inactive=true",
      );
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
      if (selectedFamilyId !== "all") {
        params.append("family_id", selectedFamilyId);
      }
      if (includeInactive) {
        params.append("include_inactive", "true");
      }
      const response = await fetch(
        `/api/admin/lens-matrices?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error("Error al cargar matrices");
      }
      const data = await response.json();
      setMatrices(data.matrices || []);
    } catch (error) {
      appLogger.error("Error fetching matrices:", error);
      toast.error("Error al cargar matrices de precios");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (matrix?: LensPriceMatrix) => {
    if (matrix) {
      setEditingMatrix(matrix);
      setFormData({
        lens_family_id: matrix.lens_family_id,
        sphere_min: matrix.sphere_min.toString(),
        sphere_max: matrix.sphere_max.toString(),
        cylinder_min: matrix.cylinder_min.toString(),
        cylinder_max: matrix.cylinder_max.toString(),
        addition_min: matrix.addition_min?.toString() || "0",
        addition_max: matrix.addition_max?.toString() || "4.0",
        base_price: matrix.base_price.toString(),
        sourcing_type: matrix.sourcing_type as "stock" | "surfaced",
        cost: matrix.cost.toString(),
        is_active: matrix.is_active,
      });
    } else {
      setEditingMatrix(null);
      setFormData({
        lens_family_id: selectedFamilyId !== "all" ? selectedFamilyId : "",
        sphere_min: "",
        sphere_max: "",
        cylinder_min: "",
        cylinder_max: "",
        addition_min: "0",
        addition_max: "4.0",
        base_price: "",
        sourcing_type: "surfaced",
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
        ? `/api/admin/lens-matrices/${editingMatrix.id}`
        : "/api/admin/lens-matrices";
      const method = editingMatrix ? "PUT" : "POST";

      const body: unknown = {
        lens_family_id: formData.lens_family_id,
        sphere_min: parseFloat(formData.sphere_min),
        sphere_max: parseFloat(formData.sphere_max),
        cylinder_min: parseFloat(formData.cylinder_min),
        cylinder_max: parseFloat(formData.cylinder_max),
        addition_min: parseFloat(formData.addition_min),
        addition_max: parseFloat(formData.addition_max),
        base_price: parseFloat(formData.base_price),
        cost: parseFloat(formData.cost),
        sourcing_type: formData.sourcing_type,
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

      toast.success(
        editingMatrix
          ? "Matriz actualizada exitosamente"
          : "Matriz creada exitosamente",
      );
      handleCloseDialog();
      fetchMatrices();
    } catch (error: unknown) {
      toast.error((error as { message?: string }).message || "Error al guardar matriz");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta matriz?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lens-matrices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar matriz");
      }

      toast.success("Matriz eliminada exitosamente");
      fetchMatrices();
    } catch (error) {
      toast.error("Error al eliminar matriz");
    }
  };

  const filteredMatrices = matrices.filter((matrix) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      matrix.lens_families.name.toLowerCase().includes(searchLower) ||
      (matrix.lens_families.brand || "").toLowerCase().includes(searchLower) ||
      matrix.sourcing_type.toLowerCase().includes(searchLower)
    );
  });

  const totalMatrices = filteredMatrices.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMatrices = filteredMatrices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(totalMatrices / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFamilyId, includeInactive]);

  return (
    <div className="container mx-auto px-4 py-8">
      <LensMatrixHeader
        onImport={() => setShowImportDialog(true)}
        onNew={() => handleOpenDialog()}
      />

      <Card>
        <CardContent>
          <LensMatrixFilters
            families={families}
            includeInactive={includeInactive}
            searchTerm={searchTerm}
            selectedFamilyId={selectedFamilyId}
            onFamilyChange={setSelectedFamilyId}
            onRefresh={fetchMatrices}
            onSearchChange={setSearchTerm}
            onToggleInactive={() => setIncludeInactive(!includeInactive)}
          />

          <LensMatrixTable
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            loading={loading}
            matrices={paginatedMatrices}
            totalMatrices={totalMatrices}
            totalPages={totalPages}
            onDelete={handleDelete}
            onEdit={(matrix) => handleOpenDialog(matrix)}
            onItemsPerPageChange={setItemsPerPage}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>

      <LensMatrixFormDialog
        editingMatrix={editingMatrix}
        families={families}
        formData={formData}
        open={showDialog}
        setFormData={setFormData}
        onClose={handleCloseDialog}
        onOpenChange={setShowDialog}
        onSubmit={handleSubmit}
      />

      <ImportCSVDialog
        open={showImportDialog}
        onImportComplete={fetchMatrices}
        onOpenChange={setShowImportDialog}
      />
    </div>
  );
}
