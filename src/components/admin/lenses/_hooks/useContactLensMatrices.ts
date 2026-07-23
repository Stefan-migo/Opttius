"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';
import type { ContactLensFamily, ContactLensPriceMatrix } from "@/types/contact-lens";

interface MatrixWithFamily extends ContactLensPriceMatrix {
  contact_lens_families: ContactLensFamily;
}

export function useContactLensMatrices() {
  const [matrices, setMatrices] = useState<MatrixWithFamily[]>([]);
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<MatrixWithFamily | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [formData, setFormData] = useState({
    contact_lens_family_id: "", sphere_min: "", sphere_max: "", cylinder_min: "0", cylinder_max: "0",
    axis_min: "0", axis_max: "180", addition_min: "0", addition_max: "4.0", base_price: "", cost: "", is_active: true,
  });

  const fetchFamilies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (includeInactive) params.append("include_inactive", "true");
      const response = await fetch(`/api/admin/contact-lens-families?${params}`);
      if (response.ok) { const data = await response.json(); setFamilies(data.families || []); }
    } catch (error) { appLogger.error("Error fetching families:", error); }
  }, [includeInactive]);

  const fetchMatrices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) params.append("include_inactive", "true");
      if (selectedFamilyId !== "all") params.append("family_id", selectedFamilyId);
      const response = await fetch(`/api/admin/contact-lens-matrices?${params}`);
      if (response.ok) { const data = await response.json(); setMatrices(data.matrices || []); }
      else { toast.error("Error al cargar matrices de lentes de contacto"); }
    } catch { toast.error("Error al cargar matrices de lentes de contacto"); }
    finally { setLoading(false); }
  }, [includeInactive, selectedFamilyId]);

  useEffect(() => { fetchFamilies(); }, [fetchFamilies]);
  useEffect(() => { fetchMatrices(); }, [fetchMatrices]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedFamilyId, includeInactive]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMatrix ? `/api/admin/contact-lens-matrices/${editingMatrix.id}` : "/api/admin/contact-lens-matrices";
      const method = editingMatrix ? "PUT" : "POST";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || "Error al guardar matriz"); }
      toast.success(editingMatrix ? "Matriz actualizada" : "Matriz creada");
      setShowDialog(false); resetForm(); fetchMatrices();
    } catch (error: unknown) { toast.error((error as Error).message || "Error al guardar matriz"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta matriz?")) return;
    try {
      const response = await fetch(`/api/admin/contact-lens-matrices/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Error al eliminar matriz");
      toast.success("Matriz eliminada exitosamente"); fetchMatrices();
    } catch { toast.error("Error al eliminar matriz"); }
  };

  const resetForm = () => {
    setFormData({ contact_lens_family_id: "", sphere_min: "", sphere_max: "", cylinder_min: "0", cylinder_max: "0", axis_min: "0", axis_max: "180", addition_min: "0", addition_max: "4.0", base_price: "", cost: "", is_active: true });
    setEditingMatrix(null);
  };

  const openEditDialog = (matrix: MatrixWithFamily) => {
    setEditingMatrix(matrix);
    setFormData({
      contact_lens_family_id: matrix.contact_lens_family_id, sphere_min: matrix.sphere_min.toString(), sphere_max: matrix.sphere_max.toString(),
      cylinder_min: matrix.cylinder_min?.toString() || "0", cylinder_max: matrix.cylinder_max?.toString() || "0",
      axis_min: matrix.axis_min?.toString() || "0", axis_max: matrix.axis_max?.toString() || "180",
      addition_min: matrix.addition_min?.toString() || "0", addition_max: matrix.addition_max?.toString() || "4.0",
      base_price: matrix.base_price.toString(), cost: matrix.cost.toString(), is_active: matrix.is_active || true,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => { resetForm(); setShowDialog(true); };

  const filteredMatrices = matrices.filter((m) => {
    const s = searchTerm.toLowerCase();
    const f = m.contact_lens_families;
    return f.name.toLowerCase().includes(s) || (f.brand || "").toLowerCase().includes(s) || m.sphere_min.toString().includes(s) || m.sphere_max.toString().includes(s);
  });

  const totalMatrices = filteredMatrices.length;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatrices = filteredMatrices.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(totalMatrices / itemsPerPage);

  return {
    matrices: paginatedMatrices, families, loading, searchTerm, setSearchTerm,
    selectedFamilyId, setSelectedFamilyId, includeInactive, setIncludeInactive,
    showDialog, setShowDialog, editingMatrix, formData, setFormData,
    currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
    totalMatrices, totalPages, fetchMatrices,
    handleSubmit, handleDelete, openEditDialog, openCreateDialog,
  };
}
